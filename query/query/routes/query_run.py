"""POST /query/run — execute a query-language string against a vehicle.

Body:
    {
      "query": "count(signal) by (name)",
      "vehicle_id": "gr26",
      "start": "2026-06-03T00:00:00Z",
      "end":   "2026-06-10T00:00:00Z",
      "interval": "2h"
    }

Response:
    {
      "series":   [ { "tags": {...}, "points": [ { "bucket": ..., "value": ... } ] } ],
      "metadata": { "query": ..., "start": ..., "end": ..., "interval": ... }
    }

Parse errors come back as 400 with `{message, position}` so the UI can
underline the offending character. Execution errors are 500.
"""

from __future__ import annotations

import traceback
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from loguru import logger
from pydantic import BaseModel, Field

from query.service.auth_guard import require_user
from query.service.query_exec import run_query
from query.service.query_lang import QueryParseError, parse
from query.service.signals import INTERVALS, utc_iso

router = APIRouter()


class QueryRunRequest(BaseModel):
    query: str = Field(..., min_length=1)
    vehicle_id: str = Field(..., min_length=1)
    start: str | None = None
    end: str | None = None
    interval: str = "1h"


def _parse_ts(value: str | None, field: str) -> datetime | None:
    if value is None:
        return None
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    except ValueError as e:
        raise HTTPException(
            status_code=400, detail=f"invalid {field} timestamp: {e}"
        )


@router.post("/run")
async def post_query_run(
    body: QueryRunRequest,
    _user_id: str = Depends(require_user),
):
    try:
        try:
            ast = parse(body.query)
        except QueryParseError as e:
            return JSONResponse(
                status_code=400,
                content={"message": str(e), "position": e.position},
            )

        if body.interval not in INTERVALS:
            raise HTTPException(
                status_code=400,
                detail=f"invalid interval; must be one of {list(INTERVALS)}",
            )

        end_dt = _parse_ts(body.end, "end") or datetime.now(
            timezone.utc
        ).replace(tzinfo=None)
        start_dt = _parse_ts(body.start, "start") or (
            end_dt - timedelta(days=7)
        )
        if start_dt >= end_dt:
            raise HTTPException(
                status_code=400, detail="start must be before end"
            )

        # Guard against a pathological range × interval: the executor fills the
        # whole bucket axis in Python, so a wide window at a tiny interval can
        # OOM the service. `.every(...)` overrides the request-level interval.
        effective_interval = ast.rollup or body.interval
        if effective_interval in INTERVALS:
            step_ms = INTERVALS[effective_interval][1]
            bucket_count = int(
                (end_dt - start_dt).total_seconds() * 1000 // step_ms
            )
            MAX_BUCKETS = 50_000
            if bucket_count > MAX_BUCKETS:
                return JSONResponse(
                    status_code=400,
                    content={
                        "message": (
                            f"range too large for a {effective_interval} "
                            f"interval (~{bucket_count:,} buckets, max "
                            f"{MAX_BUCKETS:,}) — widen the interval or shorten "
                            f"the time range"
                        ),
                        "position": 0,
                    },
                )

        result = run_query(
            ast,
            vehicle_id=body.vehicle_id,
            start=start_dt,
            end=end_dt,
            interval=body.interval,
        )

        return JSONResponse(
            status_code=200,
            content={
                "series": result["series"],
                # Per-series summary of raw samples a `.reject(...)` clause cut;
                # null when the query has no reject.
                "reject_stats": result.get("reject_stats"),
                "metadata": {
                    "query": body.query,
                    "start": utc_iso(start_dt),
                    "end": utc_iso(end_dt),
                    # Effective interval — may differ from body.interval via `.every`.
                    "interval": result["interval"],
                },
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(traceback.format_exc())
        return JSONResponse(status_code=500, content={"message": str(e)})

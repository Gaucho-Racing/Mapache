"""POST /query/pairs — fetch time-aligned paired samples of 2+ signals.

This backs the non-time "custom plot" widget (signal-vs-signal): GPS lat/lng
track paths, throttle-vs-position scatters, and 3D scatters. Where /query/run
returns bucketed aggregates against time, this returns the raw (decimated)
samples of several signals aligned onto one timeline via merge_asof, so the
caller can plot one signal against another.

Body:
    {
      "vehicle_id": "gr26",
      "signals": ["gps_latitude", "gps_longitude"],
      "start": "2026-06-03T00:00:00Z",
      "end":   "2026-06-03T01:00:00Z",
      "tolerance_ms": 50,
      "fill": "none",
      "max_points": 5000
    }

Response (BARE — the gateway adds the {data: ...} envelope):
    {
      "columns": ["produced_at", "gps_latitude", "gps_longitude"],
      "rows": [ { "produced_at": "...Z", "gps_latitude": .., "gps_longitude": .. }, ... ]
    }
"""

from __future__ import annotations

import math
import traceback
from datetime import datetime, timedelta, timezone

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from loguru import logger
from pydantic import BaseModel, Field

from query.service.auth_guard import require_user
from query.service.query import merge_signals, query_signals

router = APIRouter()


class QueryPairsRequest(BaseModel):
    vehicle_id: str = Field(..., min_length=1)
    signals: list[str] = Field(..., min_length=1)
    start: str | None = None
    end: str | None = None
    tolerance_ms: int = 50
    fill: str = "none"
    # Cap the rows transferred + serialized; decimation happens in SQL inside
    # query_signals(). None → full resolution (use with care on wide windows).
    max_points: int | None = None


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


def _json_safe(value: object) -> object:
    """Coerce a cell to a JSON-serializable scalar. pandas/NaN → None."""
    if value is None:
        return None
    if isinstance(value, float):
        return None if math.isnan(value) else value
    if isinstance(value, pd.Timestamp):
        # produced_at is UTC; render an ISO string with a trailing Z so the
        # frontend's `new Date(...)` parses it as UTC like the rest of the app.
        return value.tz_convert("UTC").isoformat().replace("+00:00", "Z")
    if isinstance(value, datetime):
        return value.isoformat()
    return value


@router.post("/pairs")
async def post_query_pairs(
    body: QueryPairsRequest,
    _user_id: str = Depends(require_user),
):
    try:
        end_dt = _parse_ts(body.end, "end") or datetime.now(timezone.utc).replace(
            tzinfo=None
        )
        start_dt = _parse_ts(body.start, "start") or (end_dt - timedelta(days=7))
        if start_dt >= end_dt:
            raise HTTPException(status_code=400, detail="start must be before end")

        # query_signals() accepts ISO strings and feeds parseDateTime64BestEffort
        # in ClickHouse; pass the normalized UTC bounds back as strings.
        start_s = start_dt.isoformat()
        end_s = end_dt.isoformat()

        # One DataFrame per signal (raw, decimated to ~max_points each), then
        # align onto a single timeline with merge_asof (nearest within tolerance).
        dfs = query_signals(
            vehicle_id=body.vehicle_id,
            signals=body.signals,
            start=start_s,
            end=end_s,
            max_points=body.max_points,
        )

        if not dfs:
            return JSONResponse(
                status_code=200,
                content={"columns": ["produced_at"], "rows": []},
            )

        merged_df, _metadata = merge_signals(
            *dfs,
            strategy="smallest",
            tolerance=body.tolerance_ms,
            fill=body.fill,
        )

        columns = merged_df.columns.tolist()
        rows = [
            {col: _json_safe(rec[col]) for col in columns}
            for rec in merged_df.to_dict(orient="records")
        ]

        return JSONResponse(
            status_code=200,
            content={"columns": columns, "rows": rows},
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(traceback.format_exc())
        return JSONResponse(status_code=500, content={"message": str(e)})

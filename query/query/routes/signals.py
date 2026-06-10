"""Signals endpoints — Datadog-metrics analog for the dashboard.

GET /query/signals?vehicle_id=...&start=...&end=...
    -> [{ name, count, first_seen, last_seen }]

GET /query/signals/counts?vehicle_id=...&start=...&end=...&interval=...&name=...
    -> [{ bucket, count }]   (zero-filled across the window)
"""

import traceback
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from loguru import logger

from query.service.auth_guard import require_user
from query.service.signals import (
    INTERVALS,
    utc_iso,
    list_signal_names,
    signal_counts,
)

router = APIRouter()


def _parse_ts(value: str | None, field: str) -> datetime | None:
    if value is None:
        return None
    try:
        # Accept both 'Z' and explicit offsets; coerce to UTC for ClickHouse.
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    except ValueError as e:
        raise HTTPException(
            status_code=400, detail=f"invalid {field} timestamp: {e}"
        )


@router.get("/signals")
async def get_signals(
    vehicle_id: Annotated[str, Query()],
    start: Annotated[str | None, Query()] = None,
    end: Annotated[str | None, Query()] = None,
    _user_id: str = Depends(require_user),
):
    try:
        start_dt = _parse_ts(start, "start")
        end_dt = _parse_ts(end, "end")
        rows = list_signal_names(vehicle_id=vehicle_id, start=start_dt, end=end_dt)
        return JSONResponse(status_code=200, content={"data": rows})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(traceback.format_exc())
        return JSONResponse(status_code=500, content={"message": str(e)})


@router.get("/signals/counts")
async def get_signal_counts(
    vehicle_id: Annotated[str, Query()],
    start: Annotated[str | None, Query()] = None,
    end: Annotated[str | None, Query()] = None,
    interval: Annotated[str, Query()] = "1h",
    name: Annotated[str | None, Query()] = None,
    _user_id: str = Depends(require_user),
):
    try:
        # `datetime.utcnow()` is deprecated and returns a naive datetime;
        # use an aware-then-stripped pair so the math is unambiguous.
        end_dt = _parse_ts(end, "end") or datetime.now(timezone.utc).replace(
            tzinfo=None
        )
        start_dt = _parse_ts(start, "start") or (end_dt - timedelta(days=7))

        if start_dt >= end_dt:
            raise HTTPException(status_code=400, detail="start must be before end")

        if interval not in INTERVALS:
            raise HTTPException(
                status_code=400,
                detail=f"invalid interval; must be one of {list(INTERVALS)}",
            )

        rows = signal_counts(
            vehicle_id=vehicle_id,
            start=start_dt,
            end=end_dt,
            interval=interval,
            name=name,
        )
        return JSONResponse(
            status_code=200,
            content={
                "data": rows,
                "metadata": {
                    "start": utc_iso(start_dt),
                    "end": utc_iso(end_dt),
                    "interval": interval,
                },
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(traceback.format_exc())
        return JSONResponse(status_code=500, content={"message": str(e)})

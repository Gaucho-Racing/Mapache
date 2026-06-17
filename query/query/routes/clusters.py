"""Raw-signal browsing endpoints for the Sessions/lapache editor.

The Sessions editor creates sessions over raw signal data, so it browses the
signal table directly:

    GET /query/clusters?vehicle_id=&date=&gap=&tz=
        -> { data: [ { vehicle_id, start_time, end_time } ] }
    GET /query/clusters/dates?vehicle_id=&tz=
        -> { data: [ "YYYY-MM-DD", ... ] }
    GET /query/signals/names?vehicle_id=&start=&end=
        -> { data: [ "<name>", ... ] }
    GET /query/signals/data?vehicle_id=&signals=&start=&end=&merge=&fill=&max_points=
        -> { data: [ { produced_at, <signal>: value, ... } ], metadata: {...} }

NOTE (deviation from lapache): lapache served the decimated geo/series read at
GET /query/signals. On this branch that path is already taken by the Datadog-
metrics signals endpoint (routes/signals.py), so the read lives at
/query/signals/data instead. The ported frontend api.ts must target
/query/signals/data for fetchSignalData / fetchSignalSeries.
"""

import traceback
from datetime import datetime, timedelta
from typing import Annotated
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from loguru import logger

from query.service.auth_guard import require_user
from query.service.cluster import get_clusters, get_data_dates, get_signal_names
from query.service.raw_signal import DEFAULT_MAX_POINTS, query_signal_records

router = APIRouter()


@router.get("/clusters")
async def get_clusters_route(
    vehicle_id: Annotated[str | None, Query()] = None,
    gap: Annotated[int | None, Query()] = 30,
    date: Annotated[str | None, Query()] = None,
    tz: Annotated[str, Query()] = "UTC",
    _user_id: str = Depends(require_user),
):
    try:
        if gap is not None and gap <= 0:
            return JSONResponse(
                status_code=400,
                content={"message": "gap must be a positive number of seconds"},
            )

        # Scope the scan to a single calendar day in the caller's timezone. The
        # day boundaries are the local midnights of `date`, converted to instants
        # so they line up with the DateTime64(6,'UTC') produced_at column.
        start = end = None
        if date is not None:
            try:
                tzinfo = ZoneInfo(tz)
                day = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=tzinfo)
            except (ValueError, ZoneInfoNotFoundError):
                return JSONResponse(
                    status_code=400,
                    content={"message": "invalid date or timezone"},
                )
            start = day
            end = day + timedelta(days=1)

        clusters = get_clusters(
            vehicle_id=vehicle_id, gap_seconds=gap or 30, start=start, end=end
        )
        return JSONResponse(
            status_code=200,
            content={"data": [c.to_dict() for c in clusters]},
        )
    except Exception as e:
        logger.error(traceback.format_exc())
        return JSONResponse(status_code=500, content={"message": str(e)})


@router.get("/clusters/dates")
async def get_cluster_dates_route(
    vehicle_id: Annotated[str | None, Query()] = None,
    tz: Annotated[str, Query()] = "UTC",
    _user_id: str = Depends(require_user),
):
    try:
        if vehicle_id is None:
            return JSONResponse(
                status_code=400, content={"message": "vehicle_id is required"}
            )

        try:
            ZoneInfo(tz)
        except ZoneInfoNotFoundError:
            return JSONResponse(
                status_code=400, content={"message": "invalid timezone"}
            )

        dates = get_data_dates(vehicle_id=vehicle_id, tz=tz)
        return JSONResponse(status_code=200, content={"data": dates})
    except Exception as e:
        logger.error(traceback.format_exc())
        return JSONResponse(status_code=500, content={"message": str(e)})


@router.get("/signals/names")
async def get_signal_names_route(
    vehicle_id: Annotated[str | None, Query()] = None,
    start: Annotated[str | None, Query()] = None,
    end: Annotated[str | None, Query()] = None,
    _user_id: str = Depends(require_user),
):
    try:
        if vehicle_id is None:
            return JSONResponse(
                status_code=400, content={"message": "vehicle_id is required"}
            )

        names = get_signal_names(vehicle_id=vehicle_id, start=start, end=end)
        return JSONResponse(status_code=200, content={"data": names})
    except Exception as e:
        logger.error(traceback.format_exc())
        return JSONResponse(status_code=500, content={"message": str(e)})


@router.get("/signals/data")
async def get_signal_data_route(
    vehicle_id: Annotated[str | None, Query()] = None,
    signals: Annotated[str | None, Query()] = None,
    start: Annotated[str | None, Query()] = None,
    end: Annotated[str | None, Query()] = None,
    merge: Annotated[str, Query(enum=["smallest", "largest"])] = "smallest",
    fill: Annotated[
        str, Query(enum=["none", "forward", "backward", "linear", "time"])
    ] = "none",
    max_points: Annotated[int | None, Query()] = None,
    _user_id: str = Depends(require_user),
):
    try:
        if vehicle_id is None:
            return JSONResponse(
                status_code=400, content={"message": "vehicle_id is required"}
            )

        signal_list = (
            [s.strip() for s in signals.split(",")] if signals else []
        )
        if not signal_list or any(not s for s in signal_list):
            return JSONResponse(
                status_code=400,
                content={"message": "one or more signals are required"},
            )

        records, metadata = query_signal_records(
            vehicle_id=vehicle_id,
            signals=signal_list,
            start=start,
            end=end,
            merge=merge,
            fill=fill,
            max_points=max_points or DEFAULT_MAX_POINTS,
        )
        return JSONResponse(
            status_code=200,
            content={"data": records, "metadata": metadata},
        )
    except ValueError as e:
        return JSONResponse(status_code=400, content={"message": str(e)})
    except Exception as e:
        logger.error(traceback.format_exc())
        return JSONResponse(status_code=500, content={"message": str(e)})

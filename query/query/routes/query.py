from datetime import datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from fastapi import APIRouter, Query, Response, Header
from typing import Annotated
from loguru import logger
from fastapi.responses import JSONResponse
import numpy as np
import traceback

from query.config.config import Config
from query.model.log import QueryLog
from query.service.auth import AuthService
from query.service.log import create_log
from query.service.cluster import get_clusters, get_data_dates, get_signal_names
from query.service.query import query_signals, merge_signals
from query.service.token import get_token_by_id, validate_token
from query.service.trip import get_trip_by_id
import pandas as pd

router = APIRouter()

@router.get("/signals")
async def get_signals(
    authorization: str = Header(None),
    token: Annotated[str | None, Query()] = None,
    vehicle_id: Annotated[str | None, Query()] = None,
    signals: Annotated[str | None, Query()] = None,
    trip_id: Annotated[str | None, Query()] = None,
    start: Annotated[str | None, Query()] = None,
    end: Annotated[str | None, Query()] = None,
    merge: Annotated[str | None, Query(enum=['smallest', 'largest'])] = 'smallest',
    fill: Annotated[str | None, Query(enum=['none', 'forward', 'backward', 'linear', 'time'])] = 'none',
    tolerance: Annotated[int | None, Query()] = 50,
    export: Annotated[str | None, Query(enum=['csv', 'json', 'parquet'])] = 'json'
):
    user_id = None
    try:
        if Config.SKIP_AUTH_CHECK:
            user_id = "mock-user"
        elif authorization and "Bearer " in authorization:
            logger.info(f"Found bearer token: {authorization}")
            auth_token = authorization.split("Bearer ")[1]
            user_id = AuthService.get_user_id_from_token(auth_token)
        elif token:
            logger.info(f"Found query token: {token}")
            t = get_token_by_id(token)
            if not validate_token(t):
                return JSONResponse(
                    status_code=401,
                    content={
                        "message": "invalid query token provided",
                    }
                )
            user_id = t.user_id
        else:
            return JSONResponse(
                status_code=401,
                content={
                    "message": "you are not authorized to access this resource",
                }
            )

        logger.info(f"Successfully authenticated user: {user_id}")

        if vehicle_id is None:
            return JSONResponse(
                status_code=400,
                content={
                    "message": "vehicle_id is required",
                }
            )

        if signals is None or len(signals.split(",")) == 0 or any(not s.strip() for s in signals.split(",")):
            return JSONResponse(
                status_code=400,
                content={
                    "message": "one or more signals are required",
                }
            )

        if trip_id is not None:
            try:
                trip = get_trip_by_id(trip_id)
                if trip.get("id"):
                    start = trip.get("start_time").rstrip("Z")
                    end = trip.get("end_time").rstrip("Z")
                else:
                    return JSONResponse(
                        status_code=400,
                        content=trip
                    )
            except Exception as e:
                return JSONResponse(
                    status_code=400,
                    content={
                        "message": f"failed to get trip: {e}",
                    }
                )
        else:
            if start is not None:
                try:
                    pd.to_datetime(start)
                except ValueError:
                    return JSONResponse(
                        status_code=400,
                        content={
                            "message": "invalid start timestamp format",
                        }
                    )
            if end is not None:
                try:
                    pd.to_datetime(end)
                except ValueError:
                    return JSONResponse(
                        status_code=400,
                        content={
                            "message": "invalid end timestamp format",
                        }
                    )

        start_time = datetime.now()
        dfs = query_signals(vehicle_id=vehicle_id, signals=signals.split(","), start=start, end=end)

        merged_df, metadata = merge_signals(*dfs, strategy=merge, tolerance=tolerance, fill=fill)

        df_dict = merged_df.copy()
        df_dict['produced_at'] = df_dict['produced_at'].dt.strftime('%Y-%m-%dT%H:%M:%S.%fZ')

        df_dict = df_dict.replace([np.inf, -np.inf], None)
        df_dict = df_dict.replace({np.nan: None})

        metadata.query_latency = int((datetime.now() - start_time).total_seconds() * 1000)

        logger.info(f"Merged DataFrame: {df_dict}")
        logger.info(f"Metadata: {metadata}")

        create_log(QueryLog(
            user_id=user_id,
            parameters=f"vehicle_id={vehicle_id}, signals={signals}, start={start}, end={end}, merge={merge}, fill={fill}, tolerance={tolerance}, export={export}",
            latency=metadata.query_latency,
            status_code=200,
            error_message="",
        ))

        if export == 'json':
            return JSONResponse(
                status_code=200,
                content={
                    "data": df_dict.to_dict(orient="records"),
                    "metadata": metadata.to_dict()
                }
            )
        elif export == 'csv':
            csv_data = df_dict.to_csv(index=False)
            return Response(
                content=csv_data,
                media_type="text/csv",
                headers={
                    "Content-Disposition": "attachment; filename=export.csv"
                }
            )
        elif export == 'parquet':
            parquet_data = df_dict.to_parquet()
            return Response(
                content=parquet_data,
                media_type="application/octet-stream",
                headers={
                    "Content-Disposition": "attachment; filename=export.parquet"
                }
            )
        else:
            return JSONResponse(
                status_code=400,
                content={
                    "message": "invalid export format",
                }
            )

    except Exception as e:
        logger.error(traceback.format_exc())
        if user_id is not None:
            create_log(QueryLog(
                user_id=user_id,
                parameters=f"vehicle_id={vehicle_id}, signals={signals}, start={start}, end={end}, merge={merge}, fill={fill}, tolerance={tolerance}, export={export}",
                latency=0,
                status_code=500,
                error_message=str(e),
            ))
        return JSONResponse(
            status_code=500,
            content={
                "message": str(e),
            }
        )


def _authenticate(authorization: str | None) -> str | None:
    """Return the authenticated user id, or None if unauthorized."""
    if Config.SKIP_AUTH_CHECK:
        return "mock-user"
    if authorization and "Bearer " in authorization:
        auth_token = authorization.split("Bearer ")[1]
        return AuthService.get_user_id_from_token(auth_token)
    return None


@router.get("/signals/names")
async def get_signal_names_route(
    authorization: str = Header(None),
    vehicle_id: Annotated[str | None, Query()] = None,
    start: Annotated[str | None, Query()] = None,
    end: Annotated[str | None, Query()] = None,
):
    try:
        user_id = _authenticate(authorization)
        if user_id is None:
            return JSONResponse(
                status_code=401,
                content={"message": "you are not authorized to access this resource"},
            )

        if vehicle_id is None:
            return JSONResponse(
                status_code=400,
                content={"message": "vehicle_id is required"},
            )

        for label, value in (("start", start), ("end", end)):
            if value is not None:
                try:
                    pd.to_datetime(value)
                except ValueError:
                    return JSONResponse(
                        status_code=400,
                        content={"message": f"invalid {label} timestamp format"},
                    )

        names = get_signal_names(vehicle_id=vehicle_id, start=start, end=end)
        return JSONResponse(status_code=200, content={"data": names})

    except Exception as e:
        logger.error(traceback.format_exc())
        return JSONResponse(status_code=500, content={"message": str(e)})


@router.get("/clusters")
async def get_clusters_route(
    authorization: str = Header(None),
    vehicle_id: Annotated[str | None, Query()] = None,
    gap: Annotated[int | None, Query()] = 30,
    date: Annotated[str | None, Query()] = None,
    tz: Annotated[str, Query()] = "UTC",
):
    try:
        user_id = _authenticate(authorization)
        if user_id is None:
            return JSONResponse(
                status_code=401,
                content={"message": "you are not authorized to access this resource"},
            )

        if gap is not None and gap <= 0:
            return JSONResponse(
                status_code=400,
                content={"message": "gap must be a positive number of seconds"},
            )

        # Scope the scan to a single calendar day in the caller's timezone. The
        # day boundaries are the local midnights of `date`, converted to instants
        # so they line up with the timestamptz `produced_at` column.
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
    authorization: str = Header(None),
    vehicle_id: Annotated[str | None, Query()] = None,
    tz: Annotated[str, Query()] = "UTC",
):
    try:
        user_id = _authenticate(authorization)
        if user_id is None:
            return JSONResponse(
                status_code=401,
                content={"message": "you are not authorized to access this resource"},
            )

        if vehicle_id is None:
            return JSONResponse(
                status_code=400,
                content={"message": "vehicle_id is required"},
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

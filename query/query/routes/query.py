from datetime import datetime
from fastapi import APIRouter, Query, Response, Header
from typing import Annotated
from loguru import logger
from fastapi.responses import JSONResponse
import pandas as pd
from query.model.log import QueryLog
from query.service.auth import AuthService
from query.service.log import create_log
from query.service.query import query_signals, merge_to_smallest, merge_to_largest
import numpy as np
import traceback

from query.service.token import get_token_by_id, validate_token
from query.service.trip import get_trip_by_id

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
        if authorization and "Bearer " in authorization:
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

        if merge == 'smallest':
            merged_df, metadata = merge_to_smallest(*dfs, tolerance=tolerance, fill=fill)
        elif merge == 'largest':
            merged_df, metadata = merge_to_largest(*dfs, tolerance=tolerance, fill=fill)
        else:
            return JSONResponse(
                status_code=400,
                content={
                    "message": "invalid merge strategy", 
                }
            )
        
        # Convert timestamps to ISO format strings and handle special float values
        df_dict = merged_df.copy()
        df_dict['produced_at'] = df_dict['produced_at'].dt.tz_localize('UTC').dt.strftime('%Y-%m-%dT%H:%M:%S.%fZ')
        
        # Replace inf/-inf and NaN values with None
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
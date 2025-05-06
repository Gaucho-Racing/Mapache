from datetime import datetime
from fastapi import APIRouter, Query, Response
from typing import Annotated
from loguru import logger
from fastapi.responses import JSONResponse
import pandas as pd
from query.service.query import query_signals, merge_to_smallest, merge_to_largest
import numpy as np
import traceback

router = APIRouter()

@router.get("/signals")
async def get_signals(
    vehicle_id: Annotated[str | None, Query()] = None,
    signals: Annotated[str | None, Query()] = None,
    start: Annotated[str | None, Query()] = None,
    end: Annotated[str | None, Query()] = None,
    merge: Annotated[str | None, Query(enum=['smallest', 'largest'])] = 'smallest',
    fill: Annotated[str | None, Query(enum=['none', 'forward', 'backward', 'linear', 'time'])] = 'none',
    tolerance: Annotated[int | None, Query()] = 50,
    export: Annotated[str | None, Query(enum=['csv', 'json', 'parquet'])] = 'json'
):
    try:
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
        
        if start is not None:
            try:
                pd.to_datetime(start)
            except ValueError:
                return JSONResponse(
                    status_code=400,
                    content={
                        "message": "Invalid start timestamp format",
                    }
                )

        if end is not None:
            try:
                pd.to_datetime(end)
            except ValueError:
                return JSONResponse(
                    status_code=400,
                    content={
                        "message": "Invalid end timestamp format", 
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
                        "message": "Invalid merge strategy", 
                    }
                )
        
        logger.info(f"Merged DataFrame: {merged_df}")
        logger.info(f"Metadata: {metadata}")
        
        # Convert timestamps to ISO format strings and handle special float values
        df_dict = merged_df.copy()
        df_dict['produced_at'] = df_dict['produced_at'].dt.tz_localize('UTC').dt.strftime('%Y-%m-%dT%H:%M:%S.%fZ')
        
        # Replace inf/-inf and NaN values with None
        df_dict = df_dict.replace([np.inf, -np.inf], None)
        df_dict = df_dict.replace({np.nan: None})

        metadata.query_latency = (datetime.now() - start_time).total_seconds() * 1000

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
                    "message": "Invalid export format",
                }
            )

    except Exception as e:
        logger.error(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={
                "message": str(e),
            }
        )
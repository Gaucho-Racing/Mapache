from fastapi import APIRouter, Query, HTTPException
from typing import Annotated
from query.service.query import * #only import what is needed
from query.model.query import *
from datetime import datetime
import time # for processing time
from query.model.exceptions import TripNotFoundError, LapNotFoundError
#from query.resources.resources import get_sensors

'''
class query(BaseModel):
    status: str
    timestamp: datetime
    signals: list[dict[str:int]]
    errors: dict[str:int]
    metadata: dict[str:int]
'''

router = APIRouter()

@router.get("/")
async def get_query(
    vehicle_id: str,
    signals: Annotated[list[str], Query()],
    trip: Annotated[str | None, Query()] = None,
    lap: Annotated[str | None, Query()] = None,
    start: Annotated[int | None, Query()] = None,
    stop: Annotated[int | None, Query()] = None,
    merge: Annotated[str | None, Query(enum=['shortest', 'largest', 'largest_fill', 'raw'])] = 'shortest',
    resample: Annotated[int | None, Query()] = None,
):
    """
    Get items filtered by vehicle ID and sensors
    
    Parameters:
    - vehicle_id: Required vehicle identifier
    - signals: Required list of sensor names to retrieve
    - trip: Optional trip identifier
    - lap: Optional lap identifier
    - start: As integer (seconds since 1970-01-01T00:00:00Z)
    - stop: As integer (seconds since 1970-01-01T00:00:00Z)
    - merge: method for data to be merged
    - resample: frequency for data to be resampled
    """
    
    query_start_time = time.time()

    #verify vehicle id
    if not query_vehicle_id(vehicle_id):
        raise HTTPException(status_code=404, detail=f"The vehicle id '{vehicle_id}' does not exist")
    
    # <----- set and verify start/stop parameters ----->
    trip_start, trip_stop = None, None
    if trip:
        try:
            trip_start, trip_stop = query_trip(trip)
        except TripNotFoundError:
            raise HTTPException(
                status_code=404,
                detail=f"Trip '{trip}' not found"
            )
        except LapNotFoundError:
            raise HTTPException(
                status_code=404,
                detail=f"Lap '{lap}' not found"
            )
    if start:
        dt = datetime.utcfromtimestamp(start)
        start = dt.strftime('%Y-%m-%d %H:%M:%S')
    elif trip_start:
        start = trip_start
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Must provide either trip id or start timestamp"
        )
    if stop:
        dt = datetime.utcfromtimestamp(stop)
        stop = dt.strftime('%Y-%m-%d %H:%M:%S')
    elif trip_stop:
        stop = trip_stop
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Must provide either trip id or stop timestamp"
        )
    # <----- set and verify start/stop parameters ----->

    # query corresponding signals
    list_of_signals_dfs = query_signals(signals, start, stop)

    # merge data
    if merge == "shortest":
        merged_signals, loss = merge_to_smallest(*list_of_signals_dfs)
    elif merge == "raw":
        pass
    elif merge == "largest":
        pass
    elif merge == "largest_fill":
        pass

    if resample:
        pass

    # format data to json objects
    data = df_to_json_data(merged_signals)

    #summarize data
    query_end_time = time.time()
    processing_time = int((query_end_time - query_start_time)*1000)

    metadata = Metadata(
        nrows = 0, #dne for now
        processing_time_ms = processing_time,
        max_rows_lost = loss.max(),
        avg_rows_lost = loss.mean(),
    )
    """
    Response:
    {
        "timestamp": "2024-03-21T15:30:45Z",
        "data": [...],
        "metadata": {
            "signal_count": 5,
            "total_data_points": 1000,
            "processing_time_ms": 123
        }
    }
    """
    return ResponseModel(
        timestamp = str(datetime.utcnow())[0:10] + 'T' + str(datetime.utcnow())[11:19] + 'Z',
        data = data,
        metadata = metadata,
    )
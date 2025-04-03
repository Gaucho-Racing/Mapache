from fastapi import APIRouter, Query, HTTPException
from typing import Annotated
from query.service.query import * #only import what is needed
from query.model.query import *
from datetime import datetime
import time # for processing time
#from query.resources.resources import get_sensors

#need to rename sensors to signals

vehicle_ids = ["gr24"]

'''
class query(BaseModel):
    status: str
    timestamp: datetime
    signals: list[dict[str:int]]
    errors: dict[str:int]
    metadata: dict[str:int]
'''

router = APIRouter()

vehicle_ids = ['gr24']

@router.get("/")
async def get_query(
    vehicle_id: str,
    signals: Annotated[list[str], Query()],
    trip: Annotated[str | None, Query()] = None,
    lap: Annotated[str | None, Query()] = None,
    start: Annotated[int | None, Query()] = None,
    stop: Annotated[int | None, Query()] = None,
):
    """
    Get items filtered by vehicle ID and sensors
    
    Parameters:
    - vehicle_id: Required vehicle identifier
    - signals: Required list of sensor names to retrieve
    - trip: Optional trip identifier
    - lap: Optional lap identifier
    - start: Optional start timestamp
    - stop: Optional stop timestamp
    """
    
    query_start_time = time.time()
    #verify vehicle id
    query_vehicle_id(vehicle_id)

    # query trip inforation
    err, start, stop = query_trip(trip) # does not yet support lap

    # query corresponding data
    list_of_signals_dfs = query_signals(signals, start, stop)

    # truncate data
    merged_signals, loss = merge_to_smallest(*list_of_signals_dfs)

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
        "status": "success",
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
        status = "success",
        timestamp = str(datetime.utcnow())[0:10] + 'T' + str(datetime.utcnow())[11:19] + 'Z',
        data = data,
        metadata = metadata,
    )


"""
TODO:
fix comments
fastSync
def query_trip
propper naming conventions
exception handeling should happen in the functions and not in the route
verify everything works
"""
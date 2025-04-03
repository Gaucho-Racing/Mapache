from fastapi import APIRouter, Query, HTTPException
from typing import Annotated
from query.service.query import * #only import what is needed
from pydantic import BaseModel
from datetime import datetime
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
    - sensors: Required list of sensor names to retrieve
    - trip: Optional trip identifier
    - lap: Optional lap identifier
    - start: Optional start timestamp
    - stop: Optional stop timestamp
    """
    
    # <------ Exception Handling ------>
    if vehicle_id not in vehicle_ids:
        raise HTTPException(status_code=400, detail="Invalid vehicle_id")
    missing_signals = [s for s in signals if s not in get_signals(vehicle_id)]
    if missing_signals:
        raise HTTPException(status_code=400, detail=f"The following signals do not exist {missing_signals}")
    if trip:
        #takes priority over start/stop should change in future
        err, start, stop = query_trip(trip, lap) #if lap is none return entire trip
        if err:
            raise HTTPException(status_code=400, detail=f"Invalid Trip")
    elif start is None or stop is None:
        raise HTTPException(status_code=400, detail=f"Invalid Trip")
    # <------ Exception Handling ------>

    # have a list of sensors called sensors
    # have a start and stop timestamp
    list_of_signals_dfs = query_signals(signals, start, stop)

    signals_json, loss = merge_to_smallest(list_of_signals_dfs)

    #signals_json corresponds to a list of Model.signal objects. loss is another json object

    return ModelQuery() #where model query is another object


"""
TODO:
fix comments
fastSync
def query_trip
propper naming conventions
exception handeling should happen in the functions and not in the route
verify everything works
"""
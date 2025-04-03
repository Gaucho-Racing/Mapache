from fastapi import APIRouter, Query, HTTPException
from typing import Annotated
from query.service.query import *
from pydantic import BaseModel
from datetime import datetime
#from query.resources.resources import get_sensors

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
    sensors: Annotated[list[str], Query()],
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
    
    #Exception Handling
    if vehicle_id not in vehicle_ids:
        raise HTTPException(status_code=400, detail="Invalid vehicle_id")
    missing_sensors = [s for s in sensors if s not in get_sensors(vehicle_id)]
    if missing_sensors:
        raise HTTPException(status_code=400, detail=f"The following sensors do not exist {missing_sensors}")
    if trip:
        #takes priority over start/stop should change in future
        err, start, stop = query_trip(trip, lap) #if lap is none return entire trip
        if err:
            raise HTTPException(status_code=400, detail=f"Invalid Trip")
    elif start is None or stop is None:
        raise HTTPException(status_code=400, detail=f"Invalid Trip")
    
    return populate_signals(vehicle_id, sensors, start[0], stop[0])



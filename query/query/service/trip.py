from typing import Any

from loguru import logger
import requests
from query.database.connection import get_db
from query.model import *
from sqlalchemy import text

from query.service.rincon import RinconService

def get_all_trips() -> list[dict[str, Any]]:
    try:
        route = "/trips"
        service = RinconService.match_route(route, "GET")
        service["endpoint"] = "http://localhost:7003"
        r = requests.get(
            f"{service['endpoint']}{route}",
            # headers={"Authorization": f"Bearer {token}"}
        )
        return r.json()
    except Exception as e:
        logger.error(f"Error getting all trips: {e}")
        raise e

def get_trip_by_id(trip_id: str) -> dict[str, Any]:
    """
    Get a trip by its ID from the trip service.
    
    Usage:
        trip = get_trip_by_id("123")
        if trip.get("id"):
            print(f"Trip: {trip}")
        else:
            print("Trip not found")
    """
    try:
        route = f"/trips/{trip_id}"
        service = RinconService.match_route(route, "GET")
        service["endpoint"] = "http://localhost:7003"
        r = requests.get(
            f"{service['endpoint']}{route}",
            # headers={"Authorization": f"Bearer {token}"}
        )
        return r.json()
    except Exception as e:
        logger.error(f"Error getting trip by id: {e}")
        raise e
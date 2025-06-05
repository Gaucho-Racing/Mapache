from typing import Any

from loguru import logger
import requests
from query.database.connection import get_db
from query.model import *
from sqlalchemy import text

from query.service.rincon import RinconService

def get_all_vehicles() -> list[dict[str, Any]]:
    try:
        route = "/vehicles"
        service = RinconService.match_route(route, "GET")
        r = requests.get(
            f"{service['endpoint']}{route}",
            # headers={"Authorization": f"Bearer {token}"}
        )
        return r.json()
    except Exception as e:
        logger.error(f"Error getting all vehicles: {e}")
        raise e

def get_vehicle_by_id(vehicle_id: str) -> dict[str, Any]:
    """
    Get a vehicle by its ID from the vehicle service.
    
    Usage:
        vehicle = get_vehicle_by_id("123")
        if vehicle.get("id"):
            print(f"Vehicle: {vehicle}")
        else:
            print("Vehicle not found")
    """
    try:
        route = f"/vehicles/{vehicle_id}"
        service = RinconService.match_route(route, "GET")
        r = requests.get(
            f"{service['endpoint']}{route}",
            # headers={"Authorization": f"Bearer {token}"}
        )
        return r.json()
    except Exception as e:
        logger.error(f"Error getting vehicle by id: {e}")
        raise e
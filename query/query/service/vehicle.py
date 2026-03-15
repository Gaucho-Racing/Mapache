from typing import Any

from loguru import logger
import requests

from query.service.rincon import match_route


def get_all_vehicles() -> list[dict[str, Any]]:
    try:
        route = "/vehicles"
        service = match_route(route, "GET")
        r = requests.get(f"{service.endpoint}{route}")
        return r.json()
    except Exception as e:
        logger.error(f"Error getting all vehicles: {e}")
        raise e


def get_vehicle_by_id(vehicle_id: str) -> dict[str, Any]:
    try:
        route = f"/vehicles/{vehicle_id}"
        service = match_route(route, "GET")
        r = requests.get(f"{service.endpoint}{route}")
        return r.json()
    except Exception as e:
        logger.error(f"Error getting vehicle by id: {e}")
        raise e

from typing import Any

from loguru import logger
import requests

from query.service.kerbecs import resolve


def get_all_vehicles() -> list[dict[str, Any]]:
    try:
        url = resolve("GET", "/api/vehicles")
        r = requests.get(url)
        return r.json()
    except Exception as e:
        logger.error(f"Error getting all vehicles: {e}")
        raise e


def get_vehicle_by_id(vehicle_id: str) -> dict[str, Any]:
    try:
        url = resolve("GET", f"/api/vehicles/{vehicle_id}")
        r = requests.get(url)
        return r.json()
    except Exception as e:
        logger.error(f"Error getting vehicle by id: {e}")
        raise e

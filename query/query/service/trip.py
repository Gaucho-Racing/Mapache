from typing import Any

from loguru import logger
import requests

from query.service.rincon import match_route


def get_all_trips() -> list[dict[str, Any]]:
    try:
        route = "/trips"
        service = match_route(route, "GET")
        r = requests.get(f"{service.endpoint}{route}")
        return r.json()
    except Exception as e:
        logger.error(f"Error getting all trips: {e}")
        raise e


def get_trip_by_id(trip_id: str) -> dict[str, Any]:
    try:
        route = f"/trips/{trip_id}"
        service = match_route(route, "GET")
        r = requests.get(f"{service.endpoint}{route}")
        return r.json()
    except Exception as e:
        logger.error(f"Error getting trip by id: {e}")
        raise e

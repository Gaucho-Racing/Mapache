from typing import Any

from loguru import logger
import requests

from query.service.kerbecs import resolve


def get_all_trips() -> list[dict[str, Any]]:
    try:
        url = resolve("GET", "/sessions")
        r = requests.get(url)
        return r.json()
    except Exception as e:
        logger.error(f"Error getting all trips: {e}")
        raise e


def get_trip_by_id(trip_id: str) -> dict[str, Any]:
    try:
        url = resolve("GET", f"/sessions/{trip_id}")
        r = requests.get(url)
        return r.json()
    except Exception as e:
        logger.error(f"Error getting trip by id: {e}")
        raise e

from loguru import logger
import requests

from query.config.config import Config

def register_rincon():
    if not Config.RINCON_ENDPOINT or not Config.RINCON_USER or not Config.RINCON_PASSWORD:
        logger.warning("Rincon env is not configured, skipping registration")
        return
    
    response = requests.post(
        f"{Config.RINCON_ENDPOINT}/rincon/services",
        json={
            "name": "query", 
            "version": Config.VERSION,
            "endpoint": Config.SERVICE_ENDPOINT,
            "health_check": Config.SERVICE_HEALTH_CHECK
        },
        auth=(Config.RINCON_USER, Config.RINCON_PASSWORD)
    )

    if response.status_code != 200:
        raise Exception(f"Failed to register with Rincon: {response.text}")
    
    service = response.json()

    response = requests.post(
        f"{Config.RINCON_ENDPOINT}/rincon/routes",
        json={
            "route": "/query/**",
            "service_name": "query",
            "method": "GET"
        },
        auth=(Config.RINCON_USER, Config.RINCON_PASSWORD)
    )

    if response.status_code != 200:
        raise Exception(f"Failed to register route with Rincon: {response.text}")

    logger.info(f"Registered service with ID: {service['id']}")
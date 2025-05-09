from loguru import logger
import requests
from typing import Dict, Any

from query.config.config import Config

class RinconService:
    @classmethod
    def register_service(cls) -> Dict[str, Any]:
        """
        Register the service with Rincon.
        
        Returns:
            Dict containing the service registration response
            
        Raises:
            Exception: If registration fails
        """
        if not Config.RINCON_ENDPOINT or not Config.RINCON_USER or not Config.RINCON_PASSWORD:
            logger.warning("Rincon env is not configured, skipping registration")
            return None
        
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
        
        return response.json()

    @classmethod
    def register_route(cls, service_name: str = "query") -> None:
        """
        Register the service route with Rincon.
        
        Args:
            service_name: Name of the service to register the route for
            
        Raises:
            Exception: If route registration fails
        """
        if not Config.RINCON_ENDPOINT or not Config.RINCON_USER or not Config.RINCON_PASSWORD:
            logger.warning("Rincon env is not configured, skipping route registration")
            return

        response = requests.post(
            f"{Config.RINCON_ENDPOINT}/rincon/routes",
            json={
                "route": "/query/**",
                "service_name": service_name,
                "method": "GET"
            },
            auth=(Config.RINCON_USER, Config.RINCON_PASSWORD)
        )

        if response.status_code != 200:
            raise Exception(f"Failed to register route with Rincon: {response.text}")

    @classmethod
    def register(cls) -> None:
        """
        Register both the service and its route with Rincon.
        
        Raises:
            Exception: If registration fails
        """
        service = cls.register_service()
        if service:
            cls.register_route()
            logger.info(f"Registered service with ID: {service['id']}")

    @classmethod
    def match_route(cls, route: str, method: str) -> Any:
        """
        Match the requested route to the target service.
        """
        r = requests.get(f"{Config.RINCON_ENDPOINT}/rincon/match?route={route}&method={method}")
        if r.status_code != 200:
            raise Exception(f"Failed to match route with Rincon: {r.json()['message']}")
        return r.json()
from loguru import logger
from rincon import RinconClient, Service, Route

from query.config.config import Config

client: RinconClient | None = None


def init_rincon() -> None:
    global client
    if not Config.RINCON_ENDPOINT or not Config.RINCON_USER or not Config.RINCON_PASSWORD:
        logger.warning("Rincon env is not configured, skipping registration")
        return

    client = RinconClient(
        url=Config.RINCON_ENDPOINT,
        auth_user=Config.RINCON_USER,
        auth_password=Config.RINCON_PASSWORD,
    )
    service = Service(
        name="query",
        version=Config.VERSION,
        endpoint=Config.SERVICE_ENDPOINT,
        health_check=Config.SERVICE_HEALTH_CHECK,
    )
    route = Route(
        route="/query/**",
        method="*",
        service_name="query",
    )
    registered = client.register(service, [route])
    logger.info(f"Registered service with ID: {registered.id}")


def match_route(route: str, method: str) -> Service:
    if client is None:
        raise RuntimeError("Rincon client is not initialized")
    return client.match_route(route, method)

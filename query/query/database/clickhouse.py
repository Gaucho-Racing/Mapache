import clickhouse_connect
from clickhouse_connect.driver.client import Client
from loguru import logger

from query.config.config import Config

_client: Client | None = None


def init_clickhouse() -> None:
    """Initialize the shared ClickHouse HTTP client."""
    global _client
    if not Config.CLICKHOUSE_HOST:
        raise ValueError("CLICKHOUSE_HOST is not set")

    _client = clickhouse_connect.get_client(
        host=Config.CLICKHOUSE_HOST,
        port=Config.CLICKHOUSE_PORT,
        username=Config.CLICKHOUSE_USER,
        password=Config.CLICKHOUSE_PASSWORD,
        database=Config.CLICKHOUSE_DATABASE,
    )
    logger.info(
        f"ClickHouse connected: {Config.CLICKHOUSE_HOST}:{Config.CLICKHOUSE_PORT}/"
        f"{Config.CLICKHOUSE_DATABASE} (server v{_client.server_version})"
    )


def get_clickhouse() -> Client:
    if _client is None:
        raise RuntimeError("ClickHouse client is not initialized")
    return _client

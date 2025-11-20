from typing import Optional

from clickhouse_driver import Client
from query.config.config import Config

_client: Optional[Client] = None

def get_client() -> Client:
    """Return a singleton ClickHouse client.

    The client is initialized on first use using the same DATABASE_* settings
    that were previously used for SQLAlchemy. Make sure your environment
    variables (DATABASE_HOST, DATABASE_PORT, DATABASE_USER, DATABASE_PASSWORD,
    DATABASE_NAME) point at your ClickHouse instance.
    """
    global _client
    if _client is None:
        if not Config.DATABASE_HOST:
            raise ValueError("DATABASE_HOST is not set")
        if not Config.DATABASE_PORT:
            raise ValueError("DATABASE_PORT is not set")
        if not Config.DATABASE_USER:
            raise ValueError("DATABASE_USER is not set")
        if Config.DATABASE_PASSWORD is None:
            raise ValueError("DATABASE_PASSWORD is not set")
        if not getattr(Config, "DATABASE_NAME", None):
            raise ValueError("DATABASE_NAME is not set")

        _client = Client(
            host=Config.DATABASE_HOST,
            port=Config.DATABASE_PORT,
            user=Config.DATABASE_USER,
            password=Config.DATABASE_PASSWORD,
            database=Config.DATABASE_NAME,
        )
    return _client

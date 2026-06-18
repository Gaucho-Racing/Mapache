import os

from sqlalchemy import URL

class Config:
    """Configuration settings for the application"""

    # Server settings
    VERSION: str = "3.9.0"
    PORT: int = int(os.getenv('PORT', 7000))

    # Postgres (operational tables: signal_definition, token, log, etc.)
    DATABASE_HOST: str = os.getenv('DATABASE_HOST')
    DATABASE_PORT: int = int(os.getenv('DATABASE_PORT'))
    DATABASE_USER: str = os.getenv('DATABASE_USER')
    DATABASE_PASSWORD: str = os.getenv('DATABASE_PASSWORD')
    DATABASE_NAME: str = os.getenv('DATABASE_NAME')

    # ClickHouse (data tables: signal, gr26_can, ping, etc.). HTTP port (8123)
    # is what clickhouse-connect uses — distinct from gr26's native 9000.
    CLICKHOUSE_HOST: str = os.getenv('CLICKHOUSE_HOST')
    CLICKHOUSE_PORT: int = int(os.getenv('CLICKHOUSE_PORT', 8123))
    CLICKHOUSE_USER: str = os.getenv('CLICKHOUSE_USER', 'default')
    CLICKHOUSE_PASSWORD: str = os.getenv('CLICKHOUSE_PASSWORD', '')
    CLICKHOUSE_DATABASE: str = os.getenv('CLICKHOUSE_DATABASE', 'mapache')

    # Kerbecs admin endpoint — used to resolve service-to-service routes.
    KERBECS_ENDPOINT: str = os.getenv('KERBECS_ENDPOINT')
    KERBECS_USER: str = os.getenv('KERBECS_USER')
    KERBECS_PASSWORD: str = os.getenv('KERBECS_PASSWORD')

    # Auth settings
    SKIP_AUTH_CHECK: bool = os.getenv('SKIP_AUTH_CHECK', 'false').lower() == 'true'
    SENTINEL_URL: str = os.getenv('SENTINEL_URL')
    SENTINEL_JWKS_URL: str = os.getenv('SENTINEL_JWKS_URL')
    SENTINEL_CLIENT_ID: str = os.getenv('SENTINEL_CLIENT_ID')

    @staticmethod
    def get_database_url() -> URL:
        # Build via URL.create rather than an f-string so credentials with
        # special characters (e.g. '@', '%', or non-ASCII bytes in the
        # password) are escaped instead of corrupting the DSN — an unescaped
        # '@' in the password otherwise bleeds into the host portion.
        return URL.create(
            "postgresql+psycopg2",
            username=Config.DATABASE_USER,
            password=Config.DATABASE_PASSWORD,
            host=Config.DATABASE_HOST,
            port=Config.DATABASE_PORT,
            database=Config.DATABASE_NAME,
        )

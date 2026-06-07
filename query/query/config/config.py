import os

class Config:
    """Configuration settings for the application"""

    # Server settings
    VERSION: str = "3.3.0"
    PORT: int = int(os.getenv('PORT', 7000))

    # ClickHouse settings. Telemetry (signal) plus the query service's own
    # metadata tables (signal_definition, query_log, query_token) all live in
    # ClickHouse now. The query service talks to it over the HTTP interface
    # (port 8123) via clickhouse-connect — distinct from gr26, which uses the
    # native protocol (9000) via clickhouse-go.
    CLICKHOUSE_HOST: str = os.getenv('CLICKHOUSE_HOST')
    CLICKHOUSE_PORT: int = int(os.getenv('CLICKHOUSE_PORT', 8123))
    CLICKHOUSE_USER: str = os.getenv('CLICKHOUSE_USER')
    CLICKHOUSE_PASSWORD: str = os.getenv('CLICKHOUSE_PASSWORD')
    CLICKHOUSE_DATABASE: str = os.getenv('CLICKHOUSE_DATABASE')
    # Set CLICKHOUSE_SECURE=true when the HTTP endpoint is TLS (port 8443).
    CLICKHOUSE_SECURE: bool = os.getenv('CLICKHOUSE_SECURE', 'false').lower() == 'true'

    # Kerbecs admin endpoint — used to resolve service-to-service routes.
    KERBECS_ENDPOINT: str = os.getenv('KERBECS_ENDPOINT')
    KERBECS_USER: str = os.getenv('KERBECS_USER')
    KERBECS_PASSWORD: str = os.getenv('KERBECS_PASSWORD')

    # Auth settings
    SKIP_AUTH_CHECK: bool = os.getenv('SKIP_AUTH_CHECK', 'false').lower() == 'true'
    SENTINEL_URL: str = os.getenv('SENTINEL_URL')
    SENTINEL_JWKS_URL: str = os.getenv('SENTINEL_JWKS_URL')
    SENTINEL_CLIENT_ID: str = os.getenv('SENTINEL_CLIENT_ID')

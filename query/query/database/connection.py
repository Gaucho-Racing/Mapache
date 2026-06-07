"""ClickHouse connection + schema bootstrap for the query service.

The signal/telemetry tables (signal, gr26_can, ping) are created and written by
gr26; this service only reads them. The three relational metadata tables the
query service owns — signal_definition, query_log, query_token — used to live in
Postgres and are now created here in ClickHouse:

- query_log is append-only, so a plain MergeTree.
- query_token and signal_definition are mutable by id (token revoke rewrites
  expires_at; definitions get re-seeded), so ReplacingMergeTree keyed on id with
  an updated_at version column. Readers use FINAL to collapse to the latest row.
"""

import clickhouse_connect
from clickhouse_connect.driver.client import Client

from query.config.config import Config

_client: Client | None = None

SIGNAL_DEFINITION_DDL = """
CREATE TABLE IF NOT EXISTS signal_definition (
    id String,
    vehicle_type String,
    name String,
    description String,
    updated_at DateTime64(6, 'UTC') DEFAULT now64(6)
) ENGINE = ReplacingMergeTree(updated_at) ORDER BY id
"""

QUERY_LOG_DDL = """
CREATE TABLE IF NOT EXISTS query_log (
    id String,
    user_id String,
    parameters String,
    status_code Int32,
    latency Int32,
    error_message String,
    timestamp DateTime64(6, 'UTC') DEFAULT now64(6)
) ENGINE = MergeTree ORDER BY (timestamp, id)
"""

QUERY_TOKEN_DDL = """
CREATE TABLE IF NOT EXISTS query_token (
    id String,
    user_id String,
    created_at DateTime64(6, 'UTC') DEFAULT now64(6),
    expires_at DateTime64(6, 'UTC'),
    updated_at DateTime64(6, 'UTC') DEFAULT now64(6)
) ENGINE = ReplacingMergeTree(updated_at) ORDER BY id
"""


def _build_client() -> Client:
    return clickhouse_connect.get_client(
        host=Config.CLICKHOUSE_HOST,
        port=Config.CLICKHOUSE_PORT,
        username=Config.CLICKHOUSE_USER,
        password=Config.CLICKHOUSE_PASSWORD or "",
        database=Config.CLICKHOUSE_DATABASE,
        secure=Config.CLICKHOUSE_SECURE,
    )


def init_db():
    """Open the ClickHouse client and create the metadata tables."""
    if not Config.CLICKHOUSE_HOST:
        raise ValueError("CLICKHOUSE_HOST is not set")
    elif not Config.CLICKHOUSE_PORT:
        raise ValueError("CLICKHOUSE_PORT is not set")
    elif not Config.CLICKHOUSE_USER:
        raise ValueError("CLICKHOUSE_USER is not set")
    elif not Config.CLICKHOUSE_DATABASE:
        raise ValueError("CLICKHOUSE_DATABASE is not set")

    global _client
    _client = _build_client()
    for ddl in (SIGNAL_DEFINITION_DDL, QUERY_LOG_DDL, QUERY_TOKEN_DDL):
        _client.command(ddl)
    print("Database initialized")


def init_test_db():
    global _client
    _client = _build_client()


def get_client() -> Client:
    """Return the shared ClickHouse client.

    clickhouse-connect's Client is safe to share across threads (it sits on a
    thread-safe urllib3 pool), so one module-level instance serves all requests.
    """
    if _client is None:
        raise ValueError("Database client is not initialized")
    return _client


def shutdown_session(exception=None):
    """Close the client (best-effort) on shutdown."""
    global _client
    if _client is not None:
        _client.close()
        _client = None

"""Provide dummy environment so Config imports cleanly under test.

The real values come from a .env at runtime; the cluster/signal-name tests
never touch a real database (DB-backed functions are monkeypatched), so any
placeholder values suffice here.
"""

import os

os.environ.setdefault("PORT", "7000")
os.environ.setdefault("CLICKHOUSE_HOST", "localhost")
os.environ.setdefault("CLICKHOUSE_PORT", "8123")
os.environ.setdefault("CLICKHOUSE_USER", "test")
os.environ.setdefault("CLICKHOUSE_PASSWORD", "test")
os.environ.setdefault("CLICKHOUSE_DATABASE", "test")

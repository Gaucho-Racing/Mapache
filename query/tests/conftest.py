"""Shared test fixtures and import-time guards for the query service tests.

query.config.config reads DB connection settings from the environment at
*class-definition* time, and casts DATABASE_PORT to int unconditionally
(`int(os.getenv('DATABASE_PORT'))`). query_exec imports that config transitively
via the ClickHouse client, so importing the module under test would crash on a
machine without those vars. conftest is imported by pytest before any test
module, so setting harmless defaults here is enough — every ClickHouse call is
monkeypatched, no live database is touched.
"""

import os

os.environ.setdefault("DATABASE_HOST", "localhost")
os.environ.setdefault("DATABASE_PORT", "5432")
os.environ.setdefault("DATABASE_USER", "test")
os.environ.setdefault("DATABASE_PASSWORD", "test")
os.environ.setdefault("DATABASE_NAME", "test")

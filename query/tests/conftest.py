"""Provide dummy environment so Config imports cleanly under test.

The real values come from a .env at runtime; the cluster/signal-name tests
never touch a real database (DB-backed functions are monkeypatched), so any
placeholder values suffice here.
"""

import os

os.environ.setdefault("PORT", "7000")
os.environ.setdefault("DATABASE_HOST", "localhost")
os.environ.setdefault("DATABASE_PORT", "5432")
os.environ.setdefault("DATABASE_USER", "test")
os.environ.setdefault("DATABASE_PASSWORD", "test")
os.environ.setdefault("DATABASE_NAME", "test")

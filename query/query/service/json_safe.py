"""Shared JSON-safe coercion for query responses.

Starlette's JSONResponse serializes with allow_nan=False, so any NaN/Inf float
that reaches it raises "Out of range float values are not JSON compliant".
Coerce non-finite floats to None and render timestamps as UTC ISO strings.
"""

from __future__ import annotations

import math
from datetime import datetime, timezone

import pandas as pd


def iso_utc_z(dt: datetime) -> str:
    """Serialize a (naive-UTC or tz-aware) datetime as an ISO-8601 string with a
    trailing 'Z'. ClickHouse columns are stored as UTC but clickhouse-connect
    returns them naive, whose bare isoformat() omits the offset — Go's RFC3339
    unmarshal then rejects it, and JS Date() misreads it as local time. Always
    emitting six-digit micros plus 'Z' keeps the UTC instant explicit for both
    consumers.
    """
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f") + "Z"


def json_safe(value: object) -> object:
    """Coerce a cell to a JSON-serializable scalar. NaN/Inf floats → None."""
    if value is None:
        return None
    if isinstance(value, float):
        return None if not math.isfinite(value) else value
    if isinstance(value, pd.Timestamp):
        # produced_at is UTC; render an ISO string with a trailing Z so the
        # frontend's `new Date(...)` parses it as UTC like the rest of the app.
        return value.tz_convert("UTC").isoformat().replace("+00:00", "Z")
    if isinstance(value, datetime):
        return value.isoformat()
    return value

"""Shared JSON-safe coercion for query responses.

Starlette's JSONResponse serializes with allow_nan=False, so any NaN/Inf float
that reaches it raises "Out of range float values are not JSON compliant".
Coerce non-finite floats to None and render timestamps as UTC ISO strings.
"""

from __future__ import annotations

import math
from datetime import datetime

import pandas as pd


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

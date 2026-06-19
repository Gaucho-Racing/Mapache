"""Shared server-side decimation for multi-signal reads against `signal`.

Both `/query/pairs` (service/query.py, pandas merge_asof path) and
`/query/signals/data` (service/raw_signal.py, pure-ClickHouse path) need the
same first step: pull a small set of signals over a window and keep one
representative sample per (name, time-bucket) so wide windows don't stream every
raw row. They diverge only afterwards in how the per-signal series are aligned
onto a single timeline (merge_asof nearest-within-tolerance vs. a union-of-
timestamps pivot), so only the decimation query is shared here; the merge
strategy stays with each caller.

Decimation semantics: for each (name, bucket) keep the earliest sample, tying
the kept value to that earliest produced_at. Expressed as
`min(produced_at), argMin(value, produced_at)` grouped by (name, bucket) — which
yields the same (timestamp, value) pair as `ORDER BY produced_at ASC LIMIT 1 BY
name, bucket` would, without ClickHouse-specific LIMIT BY. The bucket key is the
microsecond epoch integer-divided by the bucket width in micros (sub-second
buckets stay exact; toUnixTimestamp would truncate to whole seconds).
"""

from __future__ import annotations

from datetime import datetime


def bucket_seconds(
    start: datetime | None, end: datetime | None, max_points: int | None
) -> float | None:
    """Bucket width (seconds) that yields at most ~`max_points` rows over
    [start, end], or None if the window is unknown/degenerate (no decimation).
    """
    if start is None or end is None or not max_points or max_points <= 0:
        return None
    span = (end - start).total_seconds()
    if span <= 0:
        return None
    return span / max_points


def bucket_micros(bucket: float) -> int:
    """Bucket width in whole microseconds (the integer divisor for intDiv),
    floored to 1 so a sub-microsecond bucket can't become a zero divisor.
    """
    return max(1, round(bucket * 1_000_000))


def build_decimation_sql(where_clauses: list[str], bucket_param: str) -> str:
    """SQL selecting one (produced_at, name, value) row per (name, time-bucket).

    `where_clauses` are ANDed into the WHERE; `bucket_param` is the name of the
    bound Int64 parameter holding the bucket width in micros (see
    `bucket_micros`). Columns are aliased `bucket_ts`/`value`; `bucket_ts` is a
    distinct alias so the aggregate does not collide with the real `produced_at`
    referenced in WHERE/GROUP BY (reusing the name makes ClickHouse resolve those
    to the aggregate and fail with ILLEGAL_AGGREGATION).
    """
    return f"""
    SELECT
        min(produced_at) AS bucket_ts,
        name,
        argMin(value, produced_at) AS value
    FROM signal
    WHERE {' AND '.join(where_clauses)}
    GROUP BY name, intDiv(toUnixTimestamp64Micro(produced_at), {{{bucket_param}:Int64}})
    ORDER BY bucket_ts ASC
    """

"""ClickHouse-backed reads against the `signal` table.

Schema (see mapache-go/signal.go::SignalClickHouseDDL):
    id, timestamp (Int64 micros), vehicle_id, name, value, raw_value,
    produced_at DateTime64(6, 'UTC'), created_at DateTime64(6, 'UTC')

The table is a ReplacingMergeTree partitioned by toYYYYMM(produced_at) and
ordered by (vehicle_id, timestamp, name). Filtering by vehicle_id +
produced_at window keeps reads on the primary index.
"""

from datetime import datetime, timezone
from typing import Any

from query.database.clickhouse import get_clickhouse


def utc_iso(dt: datetime | None) -> str | None:
    """Render a datetime as an unambiguously-UTC ISO 8601 string.

    The `signal` table's produced_at / created_at columns are
    DateTime64(6, 'UTC'), so anything we read out is already in UTC even
    when clickhouse-connect hands us a naive datetime. Without an explicit
    'Z'/'+00:00' suffix on the wire, JavaScript's `new Date(iso)` would
    parse the string as the user's local time and silently shift the bucket
    labels (the chart would render bars 7h off in PT, etc).
    """
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")

# Bucket widths offered by /signals/counts. The value is the ClickHouse
# INTERVAL spec that's plugged into both toStartOfInterval and toInterval*.
# Picking a sensible default for a given timeframe is the caller's job.
#
# Step is stored in *milliseconds* (int) rather than seconds so sub-second
# rollups (down to 50 ms) stay exact integers — a float `step_seconds` would
# round-trip badly through the WITH FILL step and the Python zero-fill axis.
# Consumers that want seconds divide by 1000.0.
#
# produced_at is DateTime64(6, 'UTC') (microsecond precision), so
# toStartOfInterval(produced_at, INTERVAL n MILLISECOND) buckets at
# sub-second resolution natively — no intDiv-on-epoch fallback needed.
INTERVALS: dict[str, tuple[str, int]] = {
    # name: (INTERVAL clause, step milliseconds). Order is significant —
    # used by the frontend to render the rollup dropdown in ascending order.
    "50ms":  ("INTERVAL 50 MILLISECOND",  50),
    "100ms": ("INTERVAL 100 MILLISECOND", 100),
    "500ms": ("INTERVAL 500 MILLISECOND", 500),
    "1s":  ("INTERVAL 1 SECOND",   1_000),
    "10s": ("INTERVAL 10 SECOND",  10_000),
    "30s": ("INTERVAL 30 SECOND",  30_000),
    "1m":  ("INTERVAL 1 MINUTE",   60_000),
    "5m":  ("INTERVAL 5 MINUTE",   5 * 60_000),
    "15m": ("INTERVAL 15 MINUTE",  15 * 60_000),
    "30m": ("INTERVAL 30 MINUTE",  30 * 60_000),
    "1h":  ("INTERVAL 1 HOUR",     60 * 60_000),
    "2h":  ("INTERVAL 2 HOUR",     2 * 60 * 60_000),
    "6h":  ("INTERVAL 6 HOUR",     6 * 60 * 60_000),
    "1d":  ("INTERVAL 1 DAY",      24 * 60 * 60_000),
}


def list_signal_names(
    vehicle_id: str,
    start: datetime | None = None,
    end: datetime | None = None,
) -> list[dict[str, Any]]:
    """Distinct signal names seen for a vehicle, with collected counts."""
    where = ["vehicle_id = {vehicle_id:String}"]
    params: dict[str, Any] = {"vehicle_id": vehicle_id}

    if start is not None:
        where.append("produced_at >= {start:DateTime64(6)}")
        params["start"] = start
    if end is not None:
        where.append("produced_at < {end:DateTime64(6)}")
        params["end"] = end

    sql = f"""
        SELECT
            name,
            count() AS count,
            min(produced_at) AS first_seen,
            max(produced_at) AS last_seen
        FROM signal
        WHERE {' AND '.join(where)}
        GROUP BY name
        ORDER BY name
    """
    result = get_clickhouse().query(sql, parameters=params)
    return [
        {
            "name": name,
            "count": int(count),
            "first_seen": utc_iso(first_seen),
            "last_seen": utc_iso(last_seen),
        }
        for name, count, first_seen, last_seen in result.result_rows
    ]


def signal_counts(
    vehicle_id: str,
    start: datetime,
    end: datetime,
    interval: str,
    name: str | None = None,
) -> list[dict[str, Any]]:
    """Bucketed signal counts for a vehicle over a time range.

    Buckets without data are emitted as zero via WITH FILL so the frontend
    doesn't need to interpolate. `interval` must be a key of INTERVALS.
    """
    if interval not in INTERVALS:
        raise ValueError(
            f"invalid interval '{interval}', must be one of {list(INTERVALS)}"
        )

    interval_expr, step_ms = INTERVALS[interval]
    where = [
        "vehicle_id = {vehicle_id:String}",
        "produced_at >= {start:DateTime64(6)}",
        "produced_at < {end:DateTime64(6)}",
    ]
    params: dict[str, Any] = {
        "vehicle_id": vehicle_id,
        "start": start,
        "end": end,
    }
    if name is not None:
        where.append("name = {name:String}")
        params["name"] = name

    sql = f"""
        SELECT
            toStartOfInterval(produced_at, {interval_expr}) AS bucket,
            count() AS count
        FROM signal
        WHERE {' AND '.join(where)}
        GROUP BY bucket
        ORDER BY bucket WITH FILL
            FROM toStartOfInterval({{start:DateTime64(6)}}, {interval_expr})
            TO   toStartOfInterval({{end:DateTime64(6)}},   {interval_expr})
            STEP toIntervalMillisecond({step_ms})
    """
    result = get_clickhouse().query(sql, parameters=params)
    return [
        {"bucket": utc_iso(bucket_ts), "count": int(count)}
        for bucket_ts, count in result.result_rows
    ]

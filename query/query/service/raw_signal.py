"""Decimated multi-signal reads against the ClickHouse `signal` table.

Backs the Sessions/lapache track map and calibration views: fetch a small set
of signals over a time window, merged onto a single timeline and decimated
server-side so wide windows don't transfer every raw sample.

This is the ClickHouse port of lapache's pandas-based query_signals/merge_signals
(query/query/service/query.py on origin/jake/lapache). The frontend only
consumes the row records ({produced_at, <signal>: value, ...}); the heavy pandas
merge metadata is not used by the track/calibration views, so the merge + fill +
decimation are done directly in ClickHouse to avoid pulling pandas/numpy into
this service.

Schema (see clickhouse.py): signal(vehicle_id, name, timestamp Int64 micros,
value, produced_at DateTime64(6, 'UTC')).
"""

from datetime import datetime, timezone
from typing import Any

from loguru import logger

from query.database.clickhouse import get_clickhouse
from query.service.json_safe import json_safe

DEFAULT_MAX_POINTS = 5000

# Hard ceiling on the decimation target. The bucket width is span/max_points, so
# an unbounded max_points collapses buckets to near-zero width and the row count
# (and the pivot dicts/lists built from it) grows without limit. Clamp it.
MAX_MAX_POINTS = 50_000


def _parse_ts(value: str | None) -> datetime | None:
    if value is None:
        return None
    dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def _bucket_seconds(
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


def query_signal_records(
    vehicle_id: str,
    signals: list[str],
    start: str | None = None,
    end: str | None = None,
    merge: str = "smallest",
    fill: str = "none",
    max_points: int | None = None,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """Return rows of {produced_at, <signal>: value, ...} merged on a shared
    timeline, plus lightweight metadata.

    When `max_points` and a bounded window are given, each signal is decimated
    in SQL (one representative per time bucket) so the row count stays near
    `max_points`. The signals are pivoted into one row per distinct timestamp;
    `fill="forward"` carries the last seen value forward across that timeline so
    a sparse signal (e.g. a slow GPS fix) lines up with a fast one.
    """
    if not vehicle_id:
        raise ValueError("Vehicle ID is required")
    if not signals:
        raise ValueError("one or more signals are required")

    start_dt = _parse_ts(start)
    end_dt = _parse_ts(end)
    # Require a bounded window. Without one there is no decimation bucket, so the
    # query would stream every raw sample for these signals across all time into
    # memory — the main OOM vector on this endpoint.
    if start_dt is None or end_dt is None:
        raise ValueError("start and end are required")
    if not max_points or max_points <= 0:
        max_points = DEFAULT_MAX_POINTS
    max_points = min(max_points, MAX_MAX_POINTS)
    bucket = _bucket_seconds(start_dt, end_dt, max_points)
    if bucket is None:
        raise ValueError("end must be after start")

    params: dict[str, Any] = {"vehicle_id": vehicle_id, "signals": list(signals)}
    where = ["vehicle_id = {vehicle_id:String}", "name IN {signals:Array(String)}"]
    where.append("produced_at > {start:DateTime64(6)}")
    params["start"] = start_dt
    where.append("produced_at < {end:DateTime64(6)}")
    params["end"] = end_dt

    # Decimate: keep the earliest sample per (name, time-bucket) via argMin,
    # which ties the kept value to that earliest produced_at so the pair is
    # consistent. The bucket timestamp uses a distinct alias (bucket_ts) so it
    # does not collide with the real `produced_at` column referenced in
    # WHERE/GROUP BY — reusing `produced_at` as the alias makes ClickHouse
    # resolve those references to the aggregate and fail with
    # ILLEGAL_AGGREGATION.
    #
    # Bucket on the microsecond epoch with an integer divisor: the bucket width
    # is fractional seconds (e.g. 0.12s), and intDiv requires an integer divisor
    # — and toUnixTimestamp() truncates to whole seconds, which would collapse
    # all sub-second buckets. toUnixTimestamp64Micro keeps full DateTime64(6)
    # precision.
    params["bucket"] = max(1, round(bucket * 1_000_000))
    sql = f"""
    SELECT
        min(produced_at) AS bucket_ts,
        name,
        argMin(value, produced_at) AS value
    FROM signal
    WHERE {' AND '.join(where)}
    GROUP BY name, intDiv(toUnixTimestamp64Micro(produced_at), {{bucket:Int64}})
    ORDER BY bucket_ts ASC
    """

    logger.info(f"Raw signal query: {sql} | Params: {params}")
    result = get_clickhouse().query(sql, parameters=params)

    # Pivot: one row per distinct produced_at, each signal a column.
    by_ts: dict[datetime, dict[str, Any]] = {}
    for produced_at, name, value in result.result_rows:
        row = by_ts.setdefault(produced_at, {})
        row[name] = value

    ordered_ts = sorted(by_ts.keys())
    present_signals = [s for s in signals if any(s in by_ts[t] for t in ordered_ts)]

    last: dict[str, Any] = {}
    records: list[dict[str, Any]] = []
    for ts in ordered_ts:
        rec: dict[str, Any] = {"produced_at": _iso_z(ts)}
        for sig in present_signals:
            val = json_safe(by_ts[ts].get(sig))
            if val is None and fill == "forward":
                val = last.get(sig)
            if val is not None:
                last[sig] = val
                rec[sig] = val
        records.append(rec)

    metadata = {
        "num_rows": len(records),
        "num_signals": len(present_signals),
        "signal_names": present_signals,
        "merge_strategy": f"{merge}_{fill}",
    }
    return records, metadata


def _iso_z(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return (
        dt.astimezone(timezone.utc)
        .strftime("%Y-%m-%dT%H:%M:%S.%f")
        + "Z"
    )

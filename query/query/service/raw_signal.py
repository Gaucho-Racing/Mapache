"""Decimated multi-signal reads against the ClickHouse `signal` table.

Backs the Sessions track map and calibration views: fetch a small set of signals
over a time window, merged onto a single timeline and decimated server-side so
wide windows don't transfer every raw sample.

The frontend only consumes the row records ({produced_at, <signal>: value, ...});
the heavy pandas merge metadata is not used by the track/calibration views, so
the merge + fill are done here (a union-of-timestamps pivot with optional
forward-fill) without pulling pandas/numpy into this path. The decimation query
itself is shared with the /query/pairs path via service/decimate.

Schema (see clickhouse.py): signal(vehicle_id, name, timestamp Int64 micros,
value, produced_at DateTime64(6, 'UTC')).
"""

from datetime import datetime, timezone
from typing import Any

from loguru import logger

from query.database.clickhouse import get_clickhouse
from query.service.decimate import bucket_micros, bucket_seconds, build_decimation_sql
from query.service.json_safe import iso_utc_z, json_safe

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
    bucket = bucket_seconds(start_dt, end_dt, max_points)
    if bucket is None:
        raise ValueError("end must be after start")

    params: dict[str, Any] = {"vehicle_id": vehicle_id, "signals": list(signals)}
    where = ["vehicle_id = {vehicle_id:String}", "name IN {signals:Array(String)}"]
    where.append("produced_at > {start:DateTime64(6)}")
    params["start"] = start_dt
    where.append("produced_at < {end:DateTime64(6)}")
    params["end"] = end_dt

    params["bucket"] = bucket_micros(bucket)
    sql = build_decimation_sql(where, "bucket")

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
        rec: dict[str, Any] = {"produced_at": iso_utc_z(ts)}
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

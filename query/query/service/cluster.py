"""Raw-signal browsing: distinct signal names and contiguous data clusters.

Lapache is the tool used to *create* sessions, so it must browse all raw signal
data regardless of whether a session already covers it. A "cluster" is a
contiguous block of signal data separated from the next block by a gap larger
than `gap_seconds`. Clusters are derived from minute-bucketed timestamps of a
single anchor signal per vehicle, which keeps the query cheap on the large
signal table.

This is the ClickHouse port of the original Postgres implementation. The
`signal` table is a ReplacingMergeTree (see clickhouse.py / signals.py):
    id, timestamp (Int64 micros), vehicle_id, name, value, raw_value,
    produced_at DateTime64(6, 'UTC'), created_at DateTime64(6, 'UTC')
partitioned by toYYYYMM(produced_at) and ordered by
(vehicle_id, timestamp, name). Filtering by vehicle_id + produced_at window
keeps reads on the primary index.
"""

import time
from dataclasses import dataclass
from datetime import datetime, timezone
from threading import Lock
from typing import Any

from loguru import logger

from query.database.clickhouse import get_clickhouse

DEFAULT_GAP_SECONDS = 30

# The anchor signal for a vehicle is derived from a full per-vehicle aggregate
# (GROUP BY name ORDER BY count() DESC), which has to read every row for the
# vehicle. It is effectively static, yet it was being recomputed on every
# /clusters and /clusters/dates request. Cache it per vehicle with a short TTL
# so new ingest is still picked up eventually without paying the scan each call.
_ANCHOR_TTL_SECONDS = 300
_anchor_cache: dict[str, tuple[float, str | None]] = {}
_anchor_lock = Lock()


def _as_utc_naive(dt: datetime) -> datetime:
    """Coerce a datetime to a naive UTC value for binding.

    produced_at is DateTime64(6, 'UTC'); clickhouse-connect binds naive
    datetimes as-is, so callers passing tz-aware day boundaries are
    normalized to UTC first to keep the window aligned with the column.
    """
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def _iso_utc_z(dt: datetime) -> str:
    """Serialize a (naive-UTC or tz-aware) datetime as an ISO-8601 string with a
    trailing 'Z'. produced_at is stored as UTC but clickhouse-connect returns it
    naive, whose bare isoformat() omits the offset — Go's RFC3339 unmarshal then
    rejects it, and JS Date() misreads it as local time. Emitting 'Z' keeps the
    UTC instant explicit for both consumers.
    """
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f") + "Z"


@dataclass
class Cluster:
    """A contiguous block of signal data for a vehicle."""

    vehicle_id: str
    start_time: datetime
    end_time: datetime

    def to_dict(self) -> dict[str, Any]:
        return {
            "vehicle_id": self.vehicle_id,
            "start_time": _iso_utc_z(self.start_time),
            "end_time": _iso_utc_z(self.end_time),
        }


def merge_buckets(
    vehicle_id: str,
    buckets: list[tuple[datetime, datetime]],
    gap_seconds: int = DEFAULT_GAP_SECONDS,
) -> list[Cluster]:
    """Merge time-ordered (min, max) timestamp buckets into clusters.

    A new cluster begins whenever the gap between the previous bucket's end and
    the next bucket's start exceeds `gap_seconds`. Pure function — no DB access.
    """
    if not buckets:
        return []

    clusters: list[Cluster] = []
    cs, ce = buckets[0]
    for bmin, bmax in buckets[1:]:
        if (bmin - ce).total_seconds() > gap_seconds:
            clusters.append(Cluster(vehicle_id, cs, ce))
            cs = bmin
        ce = bmax
    clusters.append(Cluster(vehicle_id, cs, ce))
    return clusters


def get_signal_names(
    vehicle_id: str, start: str | None = None, end: str | None = None
) -> list[str]:
    """Return distinct signal names available for a vehicle in a time window."""
    if not vehicle_id:
        raise ValueError("Vehicle ID is required")

    params: dict[str, Any] = {"vehicle_id": vehicle_id}
    where = ["vehicle_id = {vehicle_id:String}"]
    if start is not None:
        where.append("produced_at >= {start:DateTime64(6)}")
        params["start"] = start
    if end is not None:
        where.append("produced_at <= {end:DateTime64(6)}")
        params["end"] = end

    sql = (
        "SELECT DISTINCT name FROM signal "
        f"WHERE {' AND '.join(where)} "
        "ORDER BY name ASC"
    )
    logger.info(f"Signal names query: {sql} | Params: {params}")
    result = get_clickhouse().query(sql, parameters=params)
    return [row[0] for row in result.result_rows]


def _distinct_vehicle_ids() -> list[str]:
    result = get_clickhouse().query("SELECT DISTINCT vehicle_id FROM signal")
    return [row[0] for row in result.result_rows]


def _anchor_signal(vehicle_id: str) -> str | None:
    """Pick the highest-frequency signal to bucket on.

    The anchor stands in for "the vehicle was producing data at time T", so it
    must be a signal that is present continuously. Picking the alphabetically
    first name instead would often land on a sparse, low-rate signal (e.g.
    gr26's first name has 24 rows total), which collapses every bucket — and
    therefore every cluster — to a single zero-width point.

    Cached per vehicle (see `_anchor_cache`): the underlying aggregate scans the
    whole vehicle partition, so recomputing it on every request was a dominant
    cost on the clusters/dates endpoints.
    """
    now = time.monotonic()
    with _anchor_lock:
        cached = _anchor_cache.get(vehicle_id)
        if cached is not None and now - cached[0] < _ANCHOR_TTL_SECONDS:
            return cached[1]

    result = get_clickhouse().query(
        "SELECT name FROM signal WHERE vehicle_id = {vehicle_id:String} "
        "GROUP BY name ORDER BY count() DESC LIMIT 1",
        parameters={"vehicle_id": vehicle_id},
    )
    rows = result.result_rows
    anchor = rows[0][0] if rows else None

    with _anchor_lock:
        _anchor_cache[vehicle_id] = (now, anchor)
    return anchor


def _bucket_rows(
    vehicle_id: str,
    anchor: str,
    start: datetime | None = None,
    end: datetime | None = None,
) -> list[tuple[datetime, datetime]]:
    """Minute-bucketed (min, max) produced_at for the anchor signal, ordered.

    When `start`/`end` are given the scan is restricted to that window, which is
    what keeps the per-day query cheap: only that day's anchor rows are bucketed.
    """
    params: dict[str, Any] = {"vehicle_id": vehicle_id, "anchor": anchor}
    where = [
        "vehicle_id = {vehicle_id:String}",
        "name = {anchor:String}",
    ]
    if start is not None:
        where.append("produced_at >= {start:DateTime64(6)}")
        params["start"] = _as_utc_naive(start)
    if end is not None:
        where.append("produced_at < {end:DateTime64(6)}")
        params["end"] = _as_utc_naive(end)

    sql = f"""
    SELECT min(produced_at) AS pa_min, max(produced_at) AS pa_max
    FROM signal
    WHERE {' AND '.join(where)}
    GROUP BY toStartOfMinute(produced_at)
    ORDER BY pa_min ASC
    """
    result = get_clickhouse().query(sql, parameters=params)
    return [(row[0], row[1]) for row in result.result_rows]


def get_clusters(
    vehicle_id: str | None = None,
    gap_seconds: int = DEFAULT_GAP_SECONDS,
    start: datetime | None = None,
    end: datetime | None = None,
) -> list[Cluster]:
    """Build contiguous data clusters for one vehicle, or all vehicles.

    `start`/`end` restrict the scan to a time window (e.g. a single day).
    """
    vehicle_ids = [vehicle_id] if vehicle_id else _distinct_vehicle_ids()

    all_clusters: list[Cluster] = []
    for vid in vehicle_ids:
        anchor = _anchor_signal(vid)
        if not anchor:
            continue
        buckets = _bucket_rows(vid, anchor, start, end)
        all_clusters.extend(merge_buckets(vid, buckets, gap_seconds))

    all_clusters.sort(key=lambda c: c.start_time)
    return all_clusters


def get_data_dates(vehicle_id: str, tz: str = "UTC") -> list[str]:
    """Return the distinct calendar dates (YYYY-MM-DD) that have data for a
    vehicle, expressed in timezone `tz`.

    produced_at is DateTime64(6, 'UTC'); `toDate(produced_at, tz)` converts each
    instant to wall-clock time in the caller's zone before truncating to a date.
    This backs the date selector: it picks the default (most recent) day and
    marks which days are selectable, without scanning per day.
    """
    if not vehicle_id:
        raise ValueError("Vehicle ID is required")

    anchor = _anchor_signal(vehicle_id)
    if not anchor:
        return []

    sql = """
    SELECT DISTINCT toDate(produced_at, {tz:String}) AS d
    FROM signal
    WHERE vehicle_id = {vehicle_id:String} AND name = {anchor:String}
    ORDER BY d ASC
    """
    result = get_clickhouse().query(
        sql, parameters={"vehicle_id": vehicle_id, "anchor": anchor, "tz": tz}
    )
    return [row[0].isoformat() for row in result.result_rows]

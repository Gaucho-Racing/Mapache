"""Raw-signal browsing: distinct signal names and contiguous data clusters.

Lapache is the tool used to *create* sessions, so it must browse all raw signal
data regardless of whether a session already covers it. A "cluster" is a
contiguous block of signal data separated from the next block by a gap larger
than `gap_seconds`. Clusters are derived from minute-bucketed timestamps of a
single anchor signal per vehicle, which keeps the query cheap on the large
signal table.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from loguru import logger
from sqlalchemy import text

from query.database.connection import get_db

DEFAULT_GAP_SECONDS = 30


@dataclass
class Cluster:
    """A contiguous block of signal data for a vehicle."""

    vehicle_id: str
    start_time: datetime
    end_time: datetime

    def to_dict(self) -> dict[str, Any]:
        return {
            "vehicle_id": self.vehicle_id,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat(),
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
    query_str = "SELECT DISTINCT name FROM signal WHERE vehicle_id = :vehicle_id"
    if start is not None:
        query_str += " AND produced_at >= :start"
        params["start"] = start
    if end is not None:
        query_str += " AND produced_at <= :end"
        params["end"] = end
    query_str += " ORDER BY name ASC"

    logger.info(f"Signal names query: {query_str} | Params: {params}")
    with get_db() as db:
        rows = db.execute(text(query_str).bindparams(**params)).fetchall()
    return [row[0] for row in rows]


def _distinct_vehicle_ids() -> list[str]:
    with get_db() as db:
        rows = db.execute(text("SELECT DISTINCT vehicle_id FROM signal")).fetchall()
    return [row[0] for row in rows]


def _anchor_signal(vehicle_id: str) -> str | None:
    """Pick the highest-frequency signal to bucket on.

    The anchor stands in for "the vehicle was producing data at time T", so it
    must be a signal that is present continuously. Picking the alphabetically
    first name instead would often land on a sparse, low-rate signal (e.g.
    gr26's first name has 24 rows total), which collapses every bucket — and
    therefore every cluster — to a single zero-width point.
    """
    with get_db() as db:
        row = db.execute(
            text(
                "SELECT name FROM signal WHERE vehicle_id = :vehicle_id "
                "GROUP BY name ORDER BY COUNT(*) DESC LIMIT 1"
            ).bindparams(vehicle_id=vehicle_id)
        ).fetchone()
    return row[0] if row else None


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
    query_str = """
    SELECT MIN(produced_at) AS pa_min, MAX(produced_at) AS pa_max
    FROM signal
    WHERE vehicle_id = :vehicle_id AND name = :anchor
    """
    if start is not None:
        query_str += " AND produced_at >= :start"
        params["start"] = start
    if end is not None:
        query_str += " AND produced_at < :end"
        params["end"] = end
    query_str += """
    GROUP BY FLOOR(EXTRACT(EPOCH FROM produced_at) / 60)
    ORDER BY pa_min ASC
    """
    with get_db() as db:
        rows = db.execute(text(query_str).bindparams(**params)).fetchall()
    return [(row[0], row[1]) for row in rows]


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

    `produced_at` is a timestamptz, so `AT TIME ZONE :tz` converts each instant
    to wall-clock time in the caller's zone before truncating to a date. This
    backs the date selector: it picks the default (most recent) day and marks
    which days are selectable, without scanning per day.
    """
    if not vehicle_id:
        raise ValueError("Vehicle ID is required")

    anchor = _anchor_signal(vehicle_id)
    if not anchor:
        return []

    query_str = """
    SELECT DISTINCT (produced_at AT TIME ZONE :tz)::date AS d
    FROM signal
    WHERE vehicle_id = :vehicle_id AND name = :anchor
    ORDER BY d ASC
    """
    with get_db() as db:
        rows = db.execute(
            text(query_str).bindparams(vehicle_id=vehicle_id, anchor=anchor, tz=tz)
        ).fetchall()
    return [row[0].isoformat() for row in rows]

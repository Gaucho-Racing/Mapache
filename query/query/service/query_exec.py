"""Execute a parsed query against ClickHouse and shape the response.

The output is always multi-series shaped:

    {
      "series": [
        {"tags": {"name": "ecu_acc_pedal"}, "points": [{"bucket": "...Z", "value": 12.4}, ...]},
        ...
      ],
      "metadata": {"query": ..., "start": ..., "end": ..., "interval": ...}
    }

Single-series queries (no group-by) return one series with empty `tags`.
This keeps the frontend rendering path uniform: bar/line/area all consume
the same shape.

The bucket axis is always zero-filled across [start, end) so the chart
doesn't need to interpolate.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from query.database.clickhouse import get_clickhouse
from query.service.query_lang import Query
from query.service.signals import INTERVALS, utc_iso


def _build_filter_sql(
    filters: tuple, params: dict[str, Any]
) -> list[str]:
    """Translate a list of Predicates into ClickHouse WHERE fragments.

    Within a column, predicates are OR'd (multi-value any-of). Across
    columns they're AND'd by virtue of being separate elements in the
    final WHERE list. Values containing `*` are translated to LIKE
    patterns by swapping `*` → `%`.
    """
    by_col: dict[str, list] = {}
    for p in filters:
        by_col.setdefault(p.column, []).append(p)

    out: list[str] = []
    for col, preds in by_col.items():
        sub: list[str] = []
        for i, pred in enumerate(preds):
            key = f"f_{col}_{i}"
            if "*" in pred.value:
                # ClickHouse's LIKE uses `%` as the multi-char wildcard;
                # `*` is what users naturally type. Single-char `_` and
                # literal-`%` escaping aren't useful at the signal-name
                # scale today, so we don't translate them.
                sub.append(f"{col} LIKE {{{key}:String}}")
                params[key] = pred.value.replace("*", "%")
            else:
                sub.append(f"{col} = {{{key}:String}}")
                params[key] = pred.value
        out.append(sub[0] if len(sub) == 1 else f"({' OR '.join(sub)})")
    return out


_FN_SQL: dict[str, str] = {
    # field gets substituted in below; count() ignores it entirely.
    "count":  "count()",
    "sum":    "sum({field})",
    "avg":    "avg({field})",
    "min":    "min({field})",
    "max":    "max({field})",
    "last":   "argMax({field}, produced_at)",
    "p50":    "quantile(0.5)({field})",
    "p95":    "quantile(0.95)({field})",
    "p99":    "quantile(0.99)({field})",
    "stddev": "stddevPop({field})",
}


def run_query(
    q: Query,
    vehicle_id: str,
    start: datetime,
    end: datetime,
    interval: str,
) -> dict[str, Any]:
    # An explicit rollup in the query string wins over the request-level
    # `interval` fallback. The parser already validated that it's in
    # ALLOWED_ROLLUPS, but we re-check membership in INTERVALS here so
    # divergence between the two lists fails loudly rather than silently
    # producing wrong buckets.
    effective_interval = q.rollup or interval
    if effective_interval not in INTERVALS:
        raise ValueError(
            f"invalid interval '{effective_interval}'; "
            f"must be one of {list(INTERVALS)}"
        )

    interval_expr, step_ms = INTERVALS[effective_interval]

    agg_sql = _FN_SQL[q.fn].format(field=q.field)

    select_parts = [f"toStartOfInterval(produced_at, {interval_expr}) AS bucket"]
    for col in q.group_by:
        select_parts.append(f"{col} AS series_{col}")
    select_parts.append(f"{agg_sql} AS value")

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
    # Build the user-supplied WHERE: same-column predicates OR within the
    # column (so `name = A and name = B` matches any-of, the only sensible
    # reading of "give me both signals"), distinct-column predicates AND
    # across columns. Values containing `*` become LIKE patterns.
    where.extend(_build_filter_sql(q.filters, params))

    group_by_cols = ["bucket"] + [f"series_{c}" for c in q.group_by]

    sql = f"""
        SELECT {', '.join(select_parts)}
        FROM signal
        WHERE {' AND '.join(where)}
        GROUP BY {', '.join(group_by_cols)}
        ORDER BY bucket
    """

    rows = get_clickhouse().query(sql, parameters=params).result_rows
    series = _shape_response(
        rows=rows,
        group_by=q.group_by,
        start=start,
        end=end,
        step_ms=step_ms,
    )
    return {"series": series, "interval": effective_interval}


def _shape_response(
    rows: list[tuple],
    group_by: tuple[str, ...],
    start: datetime,
    end: datetime,
    step_ms: int,
) -> list[dict[str, Any]]:
    """Pivot ClickHouse rows into the multi-series response shape.

    For grouped queries we zero-fill per-series in Python rather than
    relying on ClickHouse's WITH FILL — the latter requires INTERPOLATE
    clauses to carry group columns and gets unwieldy fast. Doing it here
    is cheap because cardinality is bounded by the number of distinct
    series the query produces (typically <100 at our scale).
    """
    # Quantize start/end to bucket boundaries so the fill axis lines up
    # with whatever ClickHouse returned.
    expected_buckets = _bucket_axis(start, end, step_ms)

    # Group rows by their series tags
    by_series: dict[tuple, dict[datetime, float]] = {}
    for row in rows:
        bucket_ts = row[0]
        group_vals = tuple(row[1 : 1 + len(group_by)])
        value = row[-1]
        by_series.setdefault(group_vals, {})[bucket_ts] = value

    # If the query had no rows at all, still emit a single empty series so
    # the chart has the right axis range to render.
    if not by_series:
        by_series[tuple([None] * len(group_by))] = {}

    out: list[dict[str, Any]] = []
    for group_vals, points_by_bucket in by_series.items():
        tags = {col: group_vals[i] for i, col in enumerate(group_by)}
        points = [
            {
                "bucket": utc_iso(b),
                "value": _coerce_number(points_by_bucket.get(b, 0)),
            }
            for b in expected_buckets
        ]
        out.append({"tags": tags, "points": points})

    # Sort series by total descending so the largest contributors render
    # on top in a stacked chart.
    out.sort(
        key=lambda s: -sum(p["value"] for p in s["points"] if p["value"] is not None)
    )
    return out


def _bucket_axis(
    start: datetime, end: datetime, step_ms: int
) -> list[datetime]:
    # Work in integer milliseconds since the epoch so sub-second steps
    # (down to 16 ms) stay exact — float seconds would drift and collapse
    # adjacent buckets. This mirrors toStartOfInterval's flooring.
    step = timedelta(milliseconds=step_ms)
    epoch = datetime(1970, 1, 1, tzinfo=start.tzinfo)
    # Round `start` down to the nearest bucket boundary so the first
    # bucket in our axis matches what ClickHouse produced.
    offset_ms = (start - epoch).total_seconds() * 1000
    aligned_offset_ms = (int(offset_ms) // step_ms) * step_ms
    aligned = epoch + timedelta(milliseconds=aligned_offset_ms)

    buckets: list[datetime] = []
    t = aligned
    while t < end:
        buckets.append(t)
        t = t + step
    return buckets


def _coerce_number(v: Any) -> float | int | None:
    """ClickHouse hands us Decimal / Float / int — collapse to JSON-safe."""
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return v
    try:
        return float(v)
    except (TypeError, ValueError):
        return None

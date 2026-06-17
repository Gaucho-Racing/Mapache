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
from query.service.query_lang import (
    Query,
    RejectBool,
    RejectCmp,
    RejectNode,
    RejectRange,
)
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


# The SQL placeholder the sigma metric expands to inside a reject expression.
# The outer query computes per-group window stats `_mean`/`_std` in a subquery
# (see run_query); `sigma` is the absolute distance from the group mean in std
# devs. nullIf guards a degenerate group where every sample is identical
# (`_std == 0`): the division yields NULL, so the comparison is NULL — the
# caller's `coalesce(..., 0)` then treats that unknown as "not an outlier" and
# keeps the sample rather than rejecting (or erroring on) divide-by-zero.
def _sigma_expr(sigma_col: str) -> str:
    return f"abs({sigma_col} - _mean) / nullIf(_std, 0)"


def _reject_uses_sigma(node: RejectNode | None) -> bool:
    """True if the reject tree references the `sigma` metric anywhere.

    Sigma needs per-group window stats, so its presence forces the executor
    onto the subquery path. value/raw_value rejects stay on the cheap path
    (just an extra NOT(...) in the main WHERE).
    """
    if node is None:
        return False
    if isinstance(node, RejectCmp):
        return node.metric == "sigma"
    if isinstance(node, RejectRange):
        return False  # sigma ranges are rejected by the parser
    if isinstance(node, RejectBool):
        return _reject_uses_sigma(node.left) or _reject_uses_sigma(node.right)
    return False


def _build_reject_sql(
    node: RejectNode, params: dict[str, Any], sigma_col: str
) -> str:
    """Translate a reject AST into a parameterized boolean SQL expression.

    The expression is *true* for rows the user wants dropped; the caller
    negates it (`WHERE NOT (<expr>)`) so matching raw samples are excluded
    before GROUP BY. All numeric thresholds are bound as ClickHouse params
    (`{key:Float64}`) — user numbers are never string-interpolated.

    `sigma_col` is the numeric column the sigma metric measures distance on
    (the query's value/raw_value field). It's only consulted when a leaf uses
    the `sigma` metric; value/raw_value leaves reference their own column.
    """
    if isinstance(node, RejectCmp):
        key = f"rj_{len(params)}"
        params[key] = node.threshold
        # sigma expands to the window-stat distance expression; value/raw_value
        # compare the column directly. `=`/`!=` pass through unchanged.
        metric_sql = _sigma_expr(sigma_col) if node.metric == "sigma" else node.metric
        return f"{metric_sql} {node.op} {{{key}:Float64}}"

    if isinstance(node, RejectRange):
        lo_key = f"rj_{len(params)}"
        params[lo_key] = node.lo
        hi_key = f"rj_{len(params)}"
        params[hi_key] = node.hi
        m = node.metric  # only value/raw_value reach here (parser blocks sigma)
        if node.inside:
            # `between`: reject samples INSIDE [lo, hi].
            return f"({m} >= {{{lo_key}:Float64}} AND {m} <= {{{hi_key}:Float64}})"
        # `outside`: reject samples OUTSIDE [lo, hi].
        return f"({m} < {{{lo_key}:Float64}} OR {m} > {{{hi_key}:Float64}})"

    if isinstance(node, RejectBool):
        left = _build_reject_sql(node.left, params, sigma_col)
        right = _build_reject_sql(node.right, params, sigma_col)
        return f"({left} {node.op.upper()} {right})"

    raise ValueError(f"unknown reject node: {node!r}")


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
    # Alias the aggregate as `agg_value`, NOT `value`: a `.reject(value > N)`
    # predicate references the raw `value` column in WHERE, and an `AS value`
    # alias would shadow it (ClickHouse then reports an aggregate in WHERE).
    # _shape_response reads the metric positionally (row[-1]), so the name is
    # free to be collision-proof.
    select_parts.append(f"{agg_sql} AS agg_value")

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

    # --- Outlier rejection (.reject(...)) -----------------------------------
    # Reject matching RAW samples before GROUP BY so a spike can't skew a
    # bucket's avg/last (and the now-empty bucket becomes a null gap). The
    # sigma metric needs the group's mean/std, so when it appears we wrap the
    # filtered base scan in a subquery that computes window stats first, then
    # reject+aggregate in the outer query. value/raw_value rejects don't need
    # the window pass — they just add a NOT(...) to the main WHERE.
    if q.reject is not None and _reject_uses_sigma(q.reject):
        # sigma measures distance on the query's numeric column. count(signal)
        # has no numeric field, so fall back to `value`; same when the field is
        # somehow non-numeric (shouldn't happen — the parser validates it).
        sigma_col = q.field if q.field in ("value", "raw_value") else "value"
        # Partition the window stats over the query's group columns so each
        # series' samples are scored against their own population; with no
        # group-by, score against the whole filtered window.
        if q.group_by:
            partition = "PARTITION BY " + ", ".join(q.group_by)
        else:
            partition = ""
        reject_expr = _build_reject_sql(q.reject, params, sigma_col)
        # `produced_at` is a MATERIALIZED column, so `SELECT *` omits it — name
        # it explicitly so the outer query's toStartOfInterval(produced_at, ...)
        # can see it. (Normal columns like the group-by `name` ride along in *.)
        inner_select = (
            f"SELECT *, produced_at, "
            f"avg({sigma_col}) OVER ({partition}) AS _mean, "
            f"stddevPop({sigma_col}) OVER ({partition}) AS _std "
            f"FROM signal WHERE {' AND '.join(where)}"
        )
        # `coalesce(..., 0)` is load-bearing: a degenerate group (every sample
        # identical → `_std == 0`) makes the sigma division NULL via nullIf, so
        # the comparison is NULL. Bare `NOT (NULL)` is NULL, which ClickHouse's
        # WHERE treats as false → the row would be DROPPED. coalescing the
        # drop-condition to 0 (false) means "unknown is not an outlier", so
        # identical samples are kept rather than silently rejected.
        sql = f"""
            SELECT {', '.join(select_parts)}
            FROM ({inner_select})
            WHERE NOT coalesce(({reject_expr}), 0)
            GROUP BY {', '.join(group_by_cols)}
            ORDER BY bucket
        """
    else:
        if q.reject is not None:
            # value/raw_value only — sigma_col is unused on this path.
            reject_expr = _build_reject_sql(q.reject, params, sigma_col="value")
            where.append(f"NOT ({reject_expr})")
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
        fn=q.fn,
        start=start,
        end=end,
        step_ms=step_ms,
    )
    return {"series": series, "interval": effective_interval}


def _shape_response(
    rows: list[tuple],
    group_by: tuple[str, ...],
    fn: str,
    start: datetime,
    end: datetime,
    step_ms: int,
) -> list[dict[str, Any]]:
    """Pivot ClickHouse rows into the multi-series response shape.

    For grouped queries we fill missing buckets per-series in Python rather
    than relying on ClickHouse's WITH FILL — the latter requires INTERPOLATE
    clauses to carry group columns and gets unwieldy fast. Doing it here
    is cheap because cardinality is bounded by the number of distinct
    series the query produces (typically <100 at our scale).

    The fill value depends on the aggregator. For `count` a missing bucket
    genuinely means "0 rows", so we zero-fill. For every other aggregator
    (avg/sum/min/max/last/p50/p95/p99/stddev) a missing bucket means "no
    sample landed here" — there is no meaningful 0, so we fill `None` (null).
    Zero-filling those would draw spurious troughs (e.g. an 8 Hz signal
    bucketed at 100 ms appears to dip to 0 between samples).
    """
    # `count` is the only aggregator where an absent bucket = 0; all others
    # null-fill so sparse signals don't show phantom 0s.
    fill_value: float | None = 0 if fn == "count" else None
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
                "value": _coerce_number(points_by_bucket.get(b, fill_value)),
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

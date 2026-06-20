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
from query.service.json_safe import json_safe
from query.service.query_lang import (
    Query,
    RejectBool,
    RejectCmp,
    RejectNode,
    RejectRange,
)
from query.service.signals import INTERVALS, utc_iso


def _column(field: str) -> str:
    """Map an MQL field/metric name (`signal.value`) to its underlying
    ClickHouse column (`value`). Bare names (e.g. the computed `sigma`)
    pass through unchanged so the rest of the SQL builder doesn't need
    to special-case them."""
    return field.split(".", 1)[1] if "." in field else field


def _build_filter_sql(
    filters: tuple, params: dict[str, Any]
) -> list[str]:
    """Translate a list of Predicates into ClickHouse WHERE fragments.

    Within a column, equality (`=`) predicates are OR'd (multi-value any-of)
    and inequality (`!=`) predicates are AND'd (none-of); the two groups are
    then AND'd together. Across columns fragments are AND'd by being separate
    elements in the final WHERE list. Values containing `*` are translated to
    LIKE / NOT LIKE patterns; literal LIKE metacharacters (`\\ % _`) are escaped
    before the wildcard `*` is swapped to `%`.
    """
    by_col: dict[str, list] = {}
    for p in filters:
        by_col.setdefault(p.column, []).append(p)

    def _leaf(col: str, key: str, value: str, negate: bool) -> str:
        if "*" in value:
            # Escape LIKE metacharacters in the literal portion FIRST so a
            # user's `_`/`%`/`\` match themselves, then translate the wildcard
            # `*` (what users type) to LIKE's `%`. `\` is ClickHouse LIKE's
            # default escape char, so it must be doubled before `%`/`_`.
            escaped = (
                value.replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_")
            )
            params[key] = escaped.replace("*", "%")
            return f"{col} NOT LIKE {{{key}:String}}" if negate else f"{col} LIKE {{{key}:String}}"
        params[key] = value
        return f"{col} != {{{key}:String}}" if negate else f"{col} = {{{key}:String}}"

    out: list[str] = []
    for col, preds in by_col.items():
        eq = [p for p in preds if p.op == "="]
        ne = [p for p in preds if p.op == "!="]
        clauses: list[str] = []
        if eq:  # any-of
            sub = [_leaf(col, f"f_{col}_eq_{i}", p.value, False) for i, p in enumerate(eq)]
            clauses.append(sub[0] if len(sub) == 1 else f"({' OR '.join(sub)})")
        for i, p in enumerate(ne):  # none-of
            clauses.append(_leaf(col, f"f_{col}_ne_{i}", p.value, True))
        if clauses:
            out.append(clauses[0] if len(clauses) == 1 else f"({' AND '.join(clauses)})")
    return out


# Distance from the group mean in std devs. nullIf guards a degenerate group
# (every sample identical → `_std == 0`): the division yields NULL, which the
# caller's `coalesce(..., 0)` treats as "not an outlier".
def _sigma_expr(sigma_col: str) -> str:
    return f"abs({sigma_col} - _mean) / nullIf(_std, 0)"


def _reject_uses_sigma(node: RejectNode | None) -> bool:
    """True if the reject tree references `sigma` anywhere.

    Sigma needs per-group window stats, forcing the executor onto the subquery
    path; value/raw_value rejects stay on the cheap NOT(...) path.
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

    The expression is *true* for rows to drop; the caller negates it
    (`WHERE NOT (<expr>)`). Thresholds are bound as params, never interpolated.
    `sigma_col` is only consulted by sigma leaves.
    """
    if isinstance(node, RejectCmp):
        key = f"rj_{len(params)}"
        params[key] = node.threshold
        metric_sql = _sigma_expr(sigma_col) if node.metric == "sigma" else _column(node.metric)
        return f"{metric_sql} {node.op} {{{key}:Float64}}"

    if isinstance(node, RejectRange):
        lo_key = f"rj_{len(params)}"
        params[lo_key] = node.lo
        hi_key = f"rj_{len(params)}"
        params[hi_key] = node.hi
        m = _column(node.metric)
        if node.inside:  # `between`: reject inside [lo, hi]
            return f"({m} >= {{{lo_key}:Float64}} AND {m} <= {{{hi_key}:Float64}})"
        return f"({m} < {{{lo_key}:Float64}} OR {m} > {{{hi_key}:Float64}})"

    if isinstance(node, RejectBool):
        left = _build_reject_sql(node.left, params, sigma_col)
        right = _build_reject_sql(node.right, params, sigma_col)
        return f"({left} {node.op.upper()} {right})"

    raise ValueError(f"unknown reject node: {node!r}")


_FN_SQL: dict[str, str] = {
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
    # Explicit `.every` rollup wins over the request-level fallback. Re-check
    # INTERVALS membership so ALLOWED_ROLLUPS divergence fails loudly.
    effective_interval = q.rollup or interval
    if effective_interval not in INTERVALS:
        raise ValueError(
            f"invalid interval '{effective_interval}'; "
            f"must be one of {list(INTERVALS)}"
        )

    interval_expr, step_ms = INTERVALS[effective_interval]

    agg_sql = _FN_SQL[q.fn].format(field=_column(q.field))

    select_parts = [f"toStartOfInterval(produced_at, {interval_expr}) AS bucket"]
    for col in q.group_by:
        select_parts.append(f"{col} AS series_{col}")
    # Alias `agg_value`, not `value`: an `AS value` alias would shadow the raw
    # `value` column a `.reject(value > N)` predicate references in WHERE.
    # _shape_response reads the metric positionally (row[-1]).
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
    where.extend(_build_filter_sql(q.filters, params))

    # Snapshot the base filters/params (vehicle_id, time window, q.filters)
    # before the reject branches append reject thresholds, so the companion
    # reject-stats query can build an independent, non-colliding predicate.
    where_base = list(where)
    base_params = dict(params)

    group_by_cols = ["bucket"] + [f"series_{c}" for c in q.group_by]

    # Reject matching RAW samples before GROUP BY so a spike can't skew a bucket
    # (the now-empty bucket becomes a null gap). The sigma metric needs the
    # group's mean/std, so it takes a window-stats subquery; value/raw_value
    # rejects just add a NOT(...) to the main WHERE.
    if q.reject is not None and _reject_uses_sigma(q.reject):
        # count(signal.name) has no numeric field, so fall back to `value`.
        sigma_col = _column(q.field) if q.field in ("signal.value", "signal.raw_value") else "value"
        # Score each series against its own population.
        if q.group_by:
            partition = "PARTITION BY " + ", ".join(q.group_by)
        else:
            partition = ""
        reject_expr = _build_reject_sql(q.reject, params, sigma_col)
        # `produced_at` is MATERIALIZED, so `SELECT *` omits it — name it
        # explicitly so the outer toStartOfInterval can see it.
        inner_select = (
            f"SELECT *, produced_at, "
            f"avg({sigma_col}) OVER ({partition}) AS _mean, "
            f"stddevPop({sigma_col}) OVER ({partition}) AS _std "
            f"FROM signal WHERE {' AND '.join(where)}"
        )
        # coalesce(..., 0) is load-bearing: a degenerate group makes the sigma
        # comparison NULL, and `NOT (NULL)` would drop the row. Coalescing to
        # false means "unknown is not an outlier", keeping identical samples.
        sql = f"""
            SELECT {', '.join(select_parts)}
            FROM ({inner_select})
            WHERE NOT coalesce(({reject_expr}), 0)
            GROUP BY {', '.join(group_by_cols)}
            ORDER BY bucket
        """
    else:
        if q.reject is not None:
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
        label=q.label,
    )

    reject_stats = None
    if q.reject is not None:
        reject_stats = _run_reject_stats(
            q=q,
            base_where=where_base,
            base_params=base_params,
        )

    return {
        "series": series,
        "interval": effective_interval,
        "reject_stats": reject_stats,
    }


def _run_reject_stats(
    q: Query,
    base_where: list[str],
    base_params: dict[str, Any],
) -> list[dict[str, Any]]:
    """Stats over the raw samples the reject WOULD CUT (the inverse predicate).

    Mirrors the main query's series grouping so each entry maps to one series.
    Uses its own params copy so the reject thresholds bound here can't collide
    with the param keys already bound by the main query.
    """
    assert q.reject is not None
    # Field the reject targets numerically; `count(signal.name)` has no numeric
    # field so fall back to `value`, mirroring the executor's sigma_col logic.
    field = _column(q.field) if q.field in ("signal.value", "signal.raw_value") else "value"

    params = dict(base_params)
    where = list(base_where)

    select_parts: list[str] = []
    for col in q.group_by:
        select_parts.append(f"{col} AS series_{col}")
    select_parts.extend(
        [
            "count() AS cut_count",
            f"min({field}) AS cut_min",
            f"max({field}) AS cut_max",
            f"avg({field}) AS cut_avg",
        ]
    )
    group_by_cols = [f"series_{c}" for c in q.group_by]

    if _reject_uses_sigma(q.reject):
        if q.group_by:
            partition = "PARTITION BY " + ", ".join(q.group_by)
        else:
            partition = ""
        reject_expr = _build_reject_sql(q.reject, params, sigma_col=field)
        inner_select = (
            f"SELECT *, produced_at, "
            f"avg({field}) OVER ({partition}) AS _mean, "
            f"stddevPop({field}) OVER ({partition}) AS _std "
            f"FROM signal WHERE {' AND '.join(where)}"
        )
        # Keep the rows the reject matches (no NOT): coalesce so a degenerate
        # group's NULL comparison counts as "not cut", matching the main query.
        sql = f"""
            SELECT {', '.join(select_parts)}
            FROM ({inner_select})
            WHERE coalesce(({reject_expr}), 0)
            {("GROUP BY " + ", ".join(group_by_cols)) if group_by_cols else ""}
        """
    else:
        reject_expr = _build_reject_sql(q.reject, params, sigma_col="value")
        where.append(f"({reject_expr})")
        sql = f"""
            SELECT {', '.join(select_parts)}
            FROM signal
            WHERE {' AND '.join(where)}
            {("GROUP BY " + ", ".join(group_by_cols)) if group_by_cols else ""}
        """

    rows = get_clickhouse().query(sql, parameters=params).result_rows
    n_groups = len(q.group_by)
    out: list[dict[str, Any]] = []
    for row in rows:
        group_vals = tuple(row[0:n_groups])
        cut_count, cut_min, cut_max, cut_avg = row[n_groups:n_groups + 4]
        if not cut_count:
            continue
        tags = {col: group_vals[i] for i, col in enumerate(q.group_by)}
        out.append(
            {
                "tags": tags,
                "cut_count": _coerce_number(cut_count),
                "min": _coerce_number(cut_min),
                "max": _coerce_number(cut_max),
                "avg": _coerce_number(cut_avg),
            }
        )
    return out


def _shape_response(
    rows: list[tuple],
    group_by: tuple[str, ...],
    fn: str,
    start: datetime,
    end: datetime,
    step_ms: int,
    label: str | None = None,
) -> list[dict[str, Any]]:
    """Pivot ClickHouse rows into the multi-series response shape.

    Missing buckets are filled per-series in Python (ClickHouse WITH FILL needs
    unwieldy INTERPOLATE clauses for group columns); cheap at our cardinality.
    `count` zero-fills (absent bucket = 0 rows); other aggregators null-fill, so
    a sparse signal doesn't draw phantom 0s between samples.
    """
    fill_value: float | None = 0 if fn == "count" else None
    expected_buckets = _bucket_axis(start, end, step_ms)

    by_series: dict[tuple, dict[datetime, float]] = {}
    for row in rows:
        bucket_ts = row[0]
        group_vals = tuple(row[1 : 1 + len(group_by)])
        value = row[-1]
        by_series.setdefault(group_vals, {})[bucket_ts] = value

    # Emit one empty series even with no rows so the chart keeps its axis range.
    if not by_series:
        by_series[tuple([None] * len(group_by))] = {}

    out: list[dict[str, Any]] = []
    for group_vals, points_by_bucket in by_series.items():
        # A label only reaches here without group_by (parser rejects the combo).
        tags = (
            {"label": label}
            if label and not group_by
            else {col: group_vals[i] for i, col in enumerate(group_by)}
        )
        points = [
            {
                "bucket": utc_iso(b),
                "value": _coerce_number(points_by_bucket.get(b, fill_value)),
            }
            for b in expected_buckets
        ]
        out.append({"tags": tags, "points": points})

    # Largest contributors first, so they render on top in a stacked chart.
    out.sort(
        key=lambda s: -sum(p["value"] for p in s["points"] if p["value"] is not None)
    )
    return out


def _bucket_axis(
    start: datetime, end: datetime, step_ms: int
) -> list[datetime]:
    # Integer milliseconds so sub-second steps stay exact (float seconds drift
    # and collapse adjacent buckets); mirrors toStartOfInterval's flooring.
    step = timedelta(milliseconds=step_ms)
    epoch = datetime(1970, 1, 1, tzinfo=start.tzinfo)
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
    """ClickHouse hands us Decimal / Float / int — collapse to JSON-safe.

    Routes through `json_safe` so non-finite floats (NaN/Inf, e.g. an agg over
    an all-NULL bucket) become None instead of tripping JSONResponse's
    allow_nan=False.
    """
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return json_safe(v)
    try:
        return json_safe(float(v))
    except (TypeError, ValueError):
        return None

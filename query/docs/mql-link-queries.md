# MQL link queries (server-side cross-series math)

Status: design only. No executor/parser code lands with this document; it
records the target so the frontend foundation (first-class `-> name` variables)
and a later server-side implementation agree on one model.

## Problem

MQL today fetches one aggregated series per statement. Cross-series math —
`power -> p`, `torque -> t`, then `p / t -> ratio` — exists **only in the
browser**. Each fetch statement runs as an independent `count/avg/...` query via
`POST /query/run`; the derived expression is evaluated client-side over the
already-fetched series.

That frontend mechanism (see `dashboard/src/lib/expr.ts`,
`dashboard/src/components/signals/DerivedTraces.tsx`,
`dashboard/src/components/signals/SignalWidget.tsx`) is fine for interactive
charting but has hard limits:

- **Browser-bound.** The math never runs server-side, so it can't back an API
  consumer, an export job, an alert, or a saved/parameterized query. Every
  client would have to re-implement the evaluator.
- **Bucket-index alignment, not a real join.** Operands are aligned purely by
  array position: `a.points[i]` is combined with `b.points[i]`. This is only
  sound because **every fetch in a widget shares one interval** (enforced in
  `SignalWidget.tsx`, see the `JOIN INVARIANT` comment near the `interval`
  memo), so all series land on the *same* zero-filled bucket axis. There is no
  timestamp join and no realignment across differing intervals — the invariant
  is load-bearing and invisible to anything outside that one widget.
- **Transfer cost.** Every referent series is shipped to the client in full even
  when only the derived result is wanted.

The server already produces exactly the substrate a correct join needs: a
**canonical, zero-filled bucket axis**. `run_query` shapes every result over
`_bucket_axis(start, end, step_ms)` (`query/query/service/query_exec.py`,
`_shape_response`) — `count` zero-fills absent buckets, other aggregators
null-fill. Two queries run over the same `(start, end, interval)` therefore emit
identical bucket sequences. That axis is the join key; we just don't expose a
way to compute over it server-side yet.

## Proposed design: `LinkRef` + multi-query `run_query`

Additive, in two pieces.

### 1. A `LinkRef` AST leaf

Add one AST node representing "the value of a named referent series at this
bucket":

```python
@dataclass(frozen=True)
class LinkRef:
    name: str   # referent series name, declared by some other query's `-> name`
```

`LinkRef` participates in the existing expression grammar exactly where a
numeric leaf does (alongside the arithmetic/comparison tree the frontend
evaluator already mirrors). A linking query is then an *expression over
`LinkRef`s* — e.g. `p / t -> ratio` parses to a divide node whose operands are
`LinkRef("p")` and `LinkRef("t")`. The single-aggregator `Query` is untouched
and remains the leaf that actually hits ClickHouse.

### 2. `run_query` accepts a referent map

Add an overload / companion entry point that takes the referents by name:

```python
def run_linked_query(
    expr: LinkExpr,                 # AST over LinkRef leaves
    referents: dict[str, Query],    # name -> the query that produces it
    vehicle_id: str,
    start: datetime,
    end: datetime,
    interval: str,
) -> dict[str, Any]:
    ...
```

Execution:

1. Run each `referents[name]` through the **existing** single-query path
   (`run_query`) with the shared `(vehicle_id, start, end, interval)`.
2. Because they share that tuple, every referent comes back on the identical
   zero-filled `INTERVALS` bucket axis (the canonical axis from
   `_bucket_axis`). This is the join key — no `merge_asof`, no timestamp
   tolerance, no realignment.
3. Evaluate `expr` per bucket index `i`, reading each `LinkRef(name)` as
   `referents_output[name].points[i]`, and emit the result over the same axis.
   Reuse the existing fill/zero semantics; degenerate values (div-by-zero,
   missing operand) become a null point exactly as the chart already expects.

The bucket axis is identical server-side and client-side, so a server-evaluated
`p / t -> ratio` is bit-for-bit what the browser computes today — the frontend
foundation and this path stay consistent.

### Why this is additive

- The `Query` dataclass (`query/query/service/query_lang.py`) stays the
  single-aggregator leaf. No field changes; `-> name` still populates
  `Query.label`.
- The current single-query path is unchanged: `POST /query/run` with one
  statement still calls `run_query` and returns one series. Linking is a new
  entry point that *composes* that path, not a rewrite of it.
- Bucketing, zero-fill, reject, and fill logic are reused verbatim. The only new
  surface is `LinkRef` + a referent-aware evaluator wrapper.
- The wire protocol extends rather than breaks: `/query/run` can keep taking a
  single string, with a new request shape (or a `dict[name, query]` plus a
  linking expression) opted into only when links are used.

## Non-goal: pairs and clusters are the wrong substrate

It is tempting to reach for the existing multi-signal paths. They do **not** fit:

- **Pairs** (`POST /query/pairs`, `query/query/routes/query_pairs.py`,
  `merge_signals`) align *raw, decimated samples* onto one timeline via
  `merge_asof` with a millisecond tolerance — for signal-vs-signal plots (GPS
  paths, scatters). That's a sample-level, tolerance-based correlation, not the
  bucketed-aggregate join links need. Aggregation is exactly what we want to
  link over, and pairs throws it away.
- **Clusters** (`query/query/service/cluster.py`) only detect contiguous blocks
  of one anchor signal's timestamps. They share the ClickHouse client and the
  `signal` table with everything else and nothing more — **no correlation, no
  join, no shared axis** between distinct series. There is no cross-series
  relationship to build on.

The join substrate is the zero-filled `INTERVALS` bucket axis that `run_query`
already emits. `LinkRef` + a referent-aware `run_query` is the minimal additive
way to compute over it server-side.

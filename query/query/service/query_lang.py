"""Tiny query language for the signals chart.

Grammar (v0.3 — method-chain):
    <fn>(<field>) ( '.' <method> '(' <args> ')' )*
    methods: .where(<pred>) .by(<col>,...) .every(<interval>)
             .reject(<bool>) .fill(<mode>)

Examples:
    count(signal)
    count(signal).by(name)
    avg(value).where(name = "ecu_acc_pedal")
    last(value).where(name in ("a", "b")).reject(sigma > 3).every(100ms)
    avg(value).reject(value outside (0, 100)).fill(last)

This is intentionally small. We want it to feel like Datadog's metric
query syntax (one aggregator + filters + group-by + automatic time
bucketing from the page's timeframe), not a full SQL dialect. The
ClickHouse query is built in `query_exec.py` from the parsed AST.

Kept mirrored with the TypeScript copy in dashboard/src/lib/query.ts — any
grammar change here must land there too.
"""

from __future__ import annotations

import re
from dataclasses import dataclass


# Aggregators we support. The value (column-aware?) tells the validator
# whether the aggregator needs a numeric `value`/`raw_value` field or can
# operate on `signal` (i.e. row-count).
FUNCTIONS: dict[str, bool] = {
    # name: requires_numeric_field
    "count":  False,  # count(signal) — counts rows
    "sum":    True,
    "avg":    True,
    "min":    True,
    "max":    True,
    "last":   True,   # last value in the bucket (argMax on produced_at)
    "p50":    True,
    "p95":    True,
    "p99":    True,
    "stddev": True,
}

NUMERIC_FIELDS = {"value", "raw_value"}
COUNT_FIELD = "signal"
ALL_FIELDS = NUMERIC_FIELDS | {COUNT_FIELD}

# Columns that may appear in a `where` predicate or `by` group. Kept
# narrow on purpose — `vehicle_id` is page-level, `produced_at` is
# timeframe-level, so neither belongs in the query string.
FILTERABLE_COLUMNS = {"name"}
GROUPABLE_COLUMNS = {"name"}

# Canonical rollup interval names. Owned here (rather than in signals.py)
# because the grammar references them — the executor's INTERVALS map keys
# off this list to wire each name to its ClickHouse INTERVAL clause.
ROLLUP_INTERVALS: tuple[str, ...] = (
    "50ms", "100ms", "500ms",
    "1s", "10s", "30s",
    "1m", "5m", "15m", "30m",
    "1h", "2h", "6h",
    "1d",
)
ALLOWED_ROLLUPS = frozenset(ROLLUP_INTERVALS)

# How null gaps (sparse buckets, rejected outliers, native-resolution joins)
# are rendered on the chart. Display-only — CSV export always keeps true NaN.
# `gap` breaks the line, `last` holds the previous value, `linear` interpolates.
FILL_MODES: tuple[str, ...] = ("gap", "last", "linear")
ALLOWED_FILL_MODES = frozenset(FILL_MODES)

# Metrics a `.reject(...)` condition can compare against a number. `value`
# and `raw_value` are the raw sample columns; `sigma` is the distance of a
# sample from its group's mean in standard deviations (computed in the
# executor via window stats). Rejection drops matching *raw samples* before
# aggregation so a spike can't skew a bucket's avg/last.
REJECT_METRICS = {"value", "raw_value", "sigma"}
_COMPARISON_OPS = {">", ">=", "<", "<=", "=", "!="}


class QueryParseError(ValueError):
    """User-visible parser error. Carries a column offset for the UI."""

    def __init__(self, message: str, position: int = 0):
        super().__init__(message)
        self.position = position


@dataclass(frozen=True)
class Predicate:
    column: str
    op: str  # always "=" for v0
    value: str


# --- Reject condition tree (.reject(...)) ----------------------------------
# A small boolean tree the executor turns into a `WHERE NOT (<expr>)` clause:
# rows where the condition holds are dropped. Leaves compare a metric to a
# number (`value > 100`, `sigma > 3`) or test a range (`value outside (0, 5)`).
# Kept as a typed tree (not a raw string) so the executor builds parameterized
# SQL and never interpolates user input.


@dataclass(frozen=True)
class RejectCmp:
    metric: str   # one of REJECT_METRICS
    op: str       # one of _COMPARISON_OPS
    threshold: float


@dataclass(frozen=True)
class RejectRange:
    metric: str   # "value" | "raw_value" (sigma ranges aren't meaningful)
    lo: float
    hi: float
    inside: bool  # True = `between` (reject inside); False = `outside`


@dataclass(frozen=True)
class RejectBool:
    op: str       # "and" | "or"
    left: "RejectNode"
    right: "RejectNode"


RejectNode = RejectCmp | RejectRange | RejectBool


@dataclass(frozen=True)
class Query:
    fn: str
    field: str
    filters: tuple[Predicate, ...] = ()
    group_by: tuple[str, ...] = ()
    # Optional rollup interval (one of INTERVALS in signals.py). When None,
    # the caller falls back to its auto-picked interval — typically a
    # function of the requested time window.
    rollup: str | None = None
    # Optional outlier-rejection condition (.reject(...)). Matching raw
    # samples are dropped before aggregation; the resulting empty buckets
    # become null gaps. None = no rejection.
    reject: RejectNode | None = None
    # Optional null-gap fill mode (.fill(...)), one of FILL_MODES. Display
    # hint only — the executor passes it through; CSV export keeps true NaN.
    fill: str | None = None


# ---------------------------------------------------------------------------
# Tokenizer
# ---------------------------------------------------------------------------

# Token order matters: `interval` (e.g. 100ms) must precede `number` so a
# trailing unit isn't split off, and the two-char comparison ops are folded
# into one `op` group whose regex tries `>=`/`<=`/`!=` before the single-char
# forms. `=` lives in `op` (not `punct`) so the parser treats `name = "x"` and
# `value > 3` uniformly.
_TOKEN_RX = re.compile(
    r"""
      (?P<ws>\s+)
    | (?P<string>"(?:[^"\\]|\\.)*")
    | (?P<interval>\d+(?:ms|[smhd]))
    | (?P<number>-?\d+(?:\.\d+)?)
    | (?P<op>>=|<=|!=|>|<|=)
    | (?P<ident>[A-Za-z_][A-Za-z0-9_]*)
    | (?P<punct>[(),.])
    """,
    re.VERBOSE,
)


@dataclass
class Token:
    kind: str      # "ident", "string", "punct"
    value: str
    pos: int


def _tokenize(s: str) -> list[Token]:
    out: list[Token] = []
    i = 0
    while i < len(s):
        m = _TOKEN_RX.match(s, i)
        if not m:
            raise QueryParseError(f"unexpected character '{s[i]}'", i)
        kind = m.lastgroup
        if kind != "ws":
            value = m.group(kind)
            if kind == "string":
                # Strip surrounding quotes; v0 doesn't handle escapes.
                value = value[1:-1]
            out.append(Token(kind=kind, value=value, pos=i))
        i = m.end()
    return out


# ---------------------------------------------------------------------------
# Parser (recursive descent over a token cursor)
# ---------------------------------------------------------------------------

# Method names recognized after the aggregator-call opener. Treated as
# regular identifiers at the lexer level — the parser dispatches on them
# inside the chain loop. Case-insensitive.
_METHODS = {"where", "by", "every", "reject", "fill"}

# Old-syntax identifiers we want to flag with a friendly migration error
# instead of a confusing "unknown method". v0.2 cleanup.
_RENAMED_METHODS = {"rollup": "every"}


class _Cursor:
    def __init__(self, tokens: list[Token]):
        self.tokens = tokens
        self.i = 0

    @property
    def eof(self) -> bool:
        return self.i >= len(self.tokens)

    def peek(self) -> Token | None:
        return None if self.eof else self.tokens[self.i]

    def advance(self) -> Token:
        t = self.tokens[self.i]
        self.i += 1
        return t

    def expect_ident(self) -> Token:
        t = self.peek()
        if t is None or t.kind != "ident":
            raise QueryParseError(
                "expected an identifier", t.pos if t else self._tail_pos()
            )
        return self.advance()

    def expect_punct(self, p: str) -> Token:
        t = self.peek()
        if t is None or t.kind != "punct" or t.value != p:
            raise QueryParseError(
                f"expected '{p}'", t.pos if t else self._tail_pos()
            )
        return self.advance()

    def _tail_pos(self) -> int:
        return self.tokens[-1].pos + len(self.tokens[-1].value) if self.tokens else 0


def parse(s: str) -> Query:
    """Parse an MQL string into a validated AST.

    Grammar (v0.2):
        <fn>(<field>) ( '.' <method> '(' <args> ')' )*

    Methods are `.where(<pred>)`, `.by(<col>[, ...])`, `.every(<interval>)`.
    Method order doesn't affect semantics — the parser collects them into
    a flat AST that the executor applies canonically.

    Raises QueryParseError with a column position so the UI can underline
    the offending character.
    """
    s = s.strip()
    if not s:
        raise QueryParseError("query is empty", 0)

    tokens = _tokenize(s)
    if not tokens:
        raise QueryParseError("query is empty", 0)

    c = _Cursor(tokens)

    fn, field_name = _parse_aggregator_call(c)

    filters: list[Predicate] = []
    group_by: list[str] = []
    rollup: str | None = None
    every_seen_pos: int | None = None
    reject: RejectNode | None = None
    reject_seen_pos: int | None = None
    fill: str | None = None
    fill_seen_pos: int | None = None

    # Method-call chain: zero or more `.method(args)` calls. Order is
    # accepted in any sequence — the semantics are the same.
    while not c.eof:
        nxt = c.peek()
        assert nxt is not None
        # If anything other than `.` appears here it's a leftover token
        # from the old infix grammar or a typo — surface a clean error.
        if nxt.kind != "punct" or nxt.value != ".":
            raise QueryParseError(
                f"unexpected '{nxt.value}' — methods are chained with '.'",
                nxt.pos,
            )
        c.advance()  # consume '.'

        method_tok = c.expect_ident()
        method = method_tok.value.lower()

        if method in _RENAMED_METHODS:
            raise QueryParseError(
                f"'.{method}' was renamed to '.{_RENAMED_METHODS[method]}'",
                method_tok.pos,
            )
        if method not in _METHODS:
            raise QueryParseError(
                f"unknown method '.{method_tok.value}'; expected one of "
                + ", ".join(f".{m}" for m in sorted(_METHODS)),
                method_tok.pos,
            )

        c.expect_punct("(")
        if method == "where":
            filters.extend(_parse_where_args(c))
        elif method == "by":
            group_by.extend(_parse_by_args(c))
        elif method == "every":
            if every_seen_pos is not None:
                raise QueryParseError(
                    "'.every' specified more than once",
                    method_tok.pos,
                )
            rollup = _parse_every_args(c)
            every_seen_pos = method_tok.pos
        elif method == "reject":
            if reject_seen_pos is not None:
                raise QueryParseError(
                    "'.reject' specified more than once; combine conditions "
                    "with 'and'/'or' inside one .reject(...)",
                    method_tok.pos,
                )
            reject = _parse_reject_args(c)
            reject_seen_pos = method_tok.pos
        elif method == "fill":
            if fill_seen_pos is not None:
                raise QueryParseError(
                    "'.fill' specified more than once", method_tok.pos
                )
            fill = _parse_fill_args(c)
            fill_seen_pos = method_tok.pos
        c.expect_punct(")")

    return Query(
        fn=fn,
        field=field_name,
        filters=tuple(filters),
        group_by=tuple(group_by),
        rollup=rollup,
        reject=reject,
        fill=fill,
    )


def _parse_aggregator_call(c: _Cursor) -> tuple[str, str]:
    """Consume `<fn>(<field>)` from the head of the token stream."""
    fn_tok = c.expect_ident()
    fn = fn_tok.value.lower()
    if fn not in FUNCTIONS:
        raise QueryParseError(
            f"unknown function '{fn_tok.value}'; expected one of "
            + ", ".join(sorted(FUNCTIONS)),
            fn_tok.pos,
        )

    c.expect_punct("(")
    field_tok = c.expect_ident()
    field_name = field_tok.value.lower()
    c.expect_punct(")")

    if field_name not in ALL_FIELDS:
        raise QueryParseError(
            f"unknown field '{field_tok.value}'; expected one of "
            + ", ".join(sorted(ALL_FIELDS)),
            field_tok.pos,
        )

    needs_numeric = FUNCTIONS[fn]
    if needs_numeric and field_name not in NUMERIC_FIELDS:
        raise QueryParseError(
            f"function '{fn}' needs a numeric field "
            f"({', '.join(sorted(NUMERIC_FIELDS))}), not '{field_name}'",
            field_tok.pos,
        )
    if not needs_numeric and field_name != COUNT_FIELD:
        raise QueryParseError(
            f"function '{fn}' operates on rows; use '{COUNT_FIELD}' instead "
            f"of '{field_name}'",
            field_tok.pos,
        )

    return fn, field_name


def _parse_where_args(c: _Cursor) -> list[Predicate]:
    """Parse the args inside one `.where(...)` call.

    Single predicate: `<col> = <string>`. Multi-value: `<col> in
    (<string>, <string>, ...)` — desugared to a list of equality
    predicates that the executor unions (OR within a column).
    """
    col_tok = c.expect_ident()
    col = col_tok.value.lower()
    if col not in FILTERABLE_COLUMNS:
        raise QueryParseError(
            f"can't filter on '{col_tok.value}'; filterable columns: "
            + ", ".join(sorted(FILTERABLE_COLUMNS)),
            col_tok.pos,
        )

    op_tok = c.peek()
    if op_tok and op_tok.kind == "ident" and op_tok.value.lower() == "in":
        c.advance()
        c.expect_punct("(")
        values = _parse_string_list(c)
        c.expect_punct(")")
        if not values:
            raise QueryParseError(
                "'in' requires at least one value",
                op_tok.pos,
            )
        return [Predicate(column=col, op="=", value=v) for v in values]

    if op_tok and op_tok.kind == "op" and op_tok.value == "=":
        c.advance()
        val_tok = c.peek()
        if val_tok is None or val_tok.kind != "string":
            raise QueryParseError(
                'expected a quoted string (e.g. "ecu_acc_pedal")',
                val_tok.pos if val_tok else c._tail_pos(),
            )
        c.advance()
        return [Predicate(column=col, op="=", value=val_tok.value)]

    raise QueryParseError(
        "expected '=' or 'in'",
        op_tok.pos if op_tok else c._tail_pos(),
    )


def _parse_string_list(c: _Cursor) -> list[str]:
    """Parse one or more quoted strings separated by commas."""
    out: list[str] = []
    while True:
        t = c.peek()
        if t is None or t.kind != "string":
            raise QueryParseError(
                "expected a quoted string",
                t.pos if t else c._tail_pos(),
            )
        c.advance()
        out.append(t.value)
        nxt = c.peek()
        if nxt and nxt.kind == "punct" and nxt.value == ",":
            c.advance()
            continue
        break
    return out


def _parse_by_args(c: _Cursor) -> list[str]:
    """Parse one or more groupable column names separated by commas."""
    cols: list[str] = []
    while True:
        col_tok = c.expect_ident()
        col = col_tok.value.lower()
        if col not in GROUPABLE_COLUMNS:
            raise QueryParseError(
                f"can't group by '{col_tok.value}'; groupable columns: "
                + ", ".join(sorted(GROUPABLE_COLUMNS)),
                col_tok.pos,
            )
        cols.append(col)
        nxt = c.peek()
        if nxt and nxt.kind == "punct" and nxt.value == ",":
            c.advance()
            continue
        break
    if not cols:
        raise QueryParseError(
            "'.by' requires at least one column", c._tail_pos()
        )
    return cols


def _parse_every_args(c: _Cursor) -> str:
    """Parse a single interval literal (e.g. `10s`, `1m`, `1h`)."""
    iv_tok = c.peek()
    if iv_tok is None or iv_tok.kind != "interval":
        raise QueryParseError(
            "expected an interval (e.g. 1m, 10s, 1h)",
            iv_tok.pos if iv_tok else c._tail_pos(),
        )
    c.advance()
    if iv_tok.value not in ALLOWED_ROLLUPS:
        raise QueryParseError(
            f"invalid interval '{iv_tok.value}'; valid: "
            + ", ".join(ROLLUP_INTERVALS),
            iv_tok.pos,
        )
    return iv_tok.value


def _parse_fill_args(c: _Cursor) -> str:
    """Parse a single fill-mode identifier (gap | last | linear)."""
    mode_tok = c.expect_ident()
    mode = mode_tok.value.lower()
    if mode not in ALLOWED_FILL_MODES:
        raise QueryParseError(
            f"invalid fill mode '{mode_tok.value}'; valid: "
            + ", ".join(FILL_MODES),
            mode_tok.pos,
        )
    return mode


# --- Reject condition parser -----------------------------------------------
# Grammar (precedence low→high), reusing the same cursor:
#   or   := and ('or' and)*
#   and  := cmp ('and' cmp)*
#   cmp  := metric <op> number
#         | metric ('between' | 'outside') '(' number ',' number ')'
#         | '(' or ')'


def _parse_reject_args(c: _Cursor) -> RejectNode:
    node = _parse_reject_or(c)
    return node


def _parse_reject_or(c: _Cursor) -> RejectNode:
    left = _parse_reject_and(c)
    while True:
        t = c.peek()
        if t and t.kind == "ident" and t.value.lower() == "or":
            c.advance()
            right = _parse_reject_and(c)
            left = RejectBool(op="or", left=left, right=right)
        else:
            return left


def _parse_reject_and(c: _Cursor) -> RejectNode:
    left = _parse_reject_cmp(c)
    while True:
        t = c.peek()
        if t and t.kind == "ident" and t.value.lower() == "and":
            c.advance()
            right = _parse_reject_cmp(c)
            left = RejectBool(op="and", left=left, right=right)
        else:
            return left


def _parse_reject_cmp(c: _Cursor) -> RejectNode:
    t = c.peek()
    if t and t.kind == "punct" and t.value == "(":
        c.advance()
        inner = _parse_reject_or(c)
        c.expect_punct(")")
        return inner

    metric_tok = c.expect_ident()
    metric = metric_tok.value.lower()
    if metric not in REJECT_METRICS:
        raise QueryParseError(
            f"can't reject on '{metric_tok.value}'; valid metrics: "
            + ", ".join(sorted(REJECT_METRICS)),
            metric_tok.pos,
        )

    nxt = c.peek()
    # Range form: metric between/outside (lo, hi)
    if nxt and nxt.kind == "ident" and nxt.value.lower() in ("between", "outside"):
        kw_tok = c.advance()
        if metric == "sigma":
            raise QueryParseError(
                "'sigma' ranges aren't meaningful; use 'sigma > N'",
                kw_tok.pos,
            )
        c.expect_punct("(")
        lo = _parse_reject_number(c)
        c.expect_punct(",")
        hi = _parse_reject_number(c)
        c.expect_punct(")")
        return RejectRange(
            metric=metric, lo=lo, hi=hi, inside=kw_tok.value.lower() == "between"
        )

    # Comparison form: metric <op> number
    if nxt is None or nxt.kind != "op":
        raise QueryParseError(
            "expected a comparison (e.g. value > 100) or 'between'/'outside'",
            nxt.pos if nxt else c._tail_pos(),
        )
    op = nxt.value
    if op not in _COMPARISON_OPS:
        raise QueryParseError(f"invalid comparison operator '{op}'", nxt.pos)
    c.advance()
    threshold = _parse_reject_number(c)
    return RejectCmp(metric=metric, op=op, threshold=threshold)


def _parse_reject_number(c: _Cursor) -> float:
    # The lexer folds an optional leading '-' into the number literal, so a
    # negative threshold (e.g. value < -5) arrives as a single token.
    t = c.peek()
    if t is None or t.kind != "number":
        raise QueryParseError(
            "expected a number", t.pos if t else c._tail_pos()
        )
    c.advance()
    return float(t.value)

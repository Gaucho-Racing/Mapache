// TypeScript mirror of query/query/service/query_lang.py — kept in sync by
// convention since the language is small. If the grammar grows we'll lift
// these into a shared schema or push the builder rendering server-side.

export type Aggregator =
  | "count"
  | "sum"
  | "avg"
  | "min"
  | "max"
  | "last"
  | "p50"
  | "p95"
  | "p99"
  | "stddev";

export const AGGREGATORS: { value: Aggregator; label: string }[] = [
  { value: "count",  label: "count"  },
  { value: "sum",    label: "sum"    },
  { value: "avg",    label: "avg"    },
  { value: "min",    label: "min"    },
  { value: "max",    label: "max"    },
  { value: "last",   label: "last"   },
  { value: "p50",    label: "p50"    },
  { value: "p95",    label: "p95"    },
  { value: "p99",    label: "p99"    },
  { value: "stddev", label: "stddev" },
];

/** Aggregators that operate on row-counts. `count` is the only one today —
 *  it takes `signal` as the field. The rest need a numeric column. */
export const ROW_COUNT_AGGS: ReadonlySet<Aggregator> = new Set(["count"]);

export type FieldName = "signal" | "value" | "raw_value";

export const NUMERIC_FIELDS: FieldName[] = ["value", "raw_value"];
export const COUNT_FIELD: FieldName = "signal";

/** Columns the user can filter or group by. Kept narrow on purpose —
 *  `vehicle_id` is page-level and `produced_at` is timeframe-level. */
export const FILTERABLE_COLUMNS = ["name"] as const;
export const GROUPABLE_COLUMNS = ["name"] as const;
export type FilterColumn = (typeof FILTERABLE_COLUMNS)[number];
export type GroupColumn = (typeof GROUPABLE_COLUMNS)[number];

/** Allowed `.rollup(<interval>)` values — mirror of ROLLUP_INTERVALS in
 *  the Python parser. Order is the display order in the builder dropdown. */
export const ROLLUP_INTERVALS = [
  "50ms", "100ms", "500ms",
  "1s", "10s", "30s",
  "1m", "5m", "15m", "30m",
  "1h", "2h", "6h",
  "1d",
] as const;
export type Rollup = (typeof ROLLUP_INTERVALS)[number];

/** Null-gap fill mode (.fill(...)) — display only; CSV keeps true NaN. */
export const FILL_MODES = ["gap", "last", "linear"] as const;
export type FillMode = (typeof FILL_MODES)[number];

/** Metrics a `.reject(...)` leaf can compare. `sigma` = distance from the
 *  group mean in standard deviations (computed server-side). */
export const REJECT_METRICS = ["value", "raw_value", "sigma"] as const;
export type RejectMetric = (typeof REJECT_METRICS)[number];

export type ComparisonOp = ">" | ">=" | "<" | "<=" | "=" | "!=";

/** Reject-condition tree, mirroring query_lang.py's RejectNode. */
export type RejectNode =
  | { kind: "cmp"; metric: RejectMetric; op: ComparisonOp; threshold: number }
  | { kind: "range"; metric: "value" | "raw_value"; lo: number; hi: number; inside: boolean }
  | { kind: "bool"; op: "and" | "or"; left: RejectNode; right: RejectNode };

export interface Predicate {
  column: FilterColumn;
  /** "=" matches; "!=" negates. `in`/`not in` desugar to a list of these. */
  op: "=" | "!=";
  value: string;
}

export interface Query {
  fn: Aggregator;
  field: FieldName;
  filters: Predicate[];
  groupBy: GroupColumn[];
  /** Optional bucket-width override. When undefined, the page falls back
   *  to its auto-picked interval (derived from the timeframe). */
  rollup?: Rollup;
  /** Optional outlier-rejection condition (.reject(...)). Matching raw
   *  samples are dropped before aggregation → null gaps. */
  reject?: RejectNode;
  /** Optional null-gap fill mode (.fill(...)). Display hint only. */
  fill?: FillMode;
  /** Optional series name set via a trailing `-> name`. Names the single
   *  result series (pie slice / legend) and exposes it as a variable for
   *  expression lines. Mutually exclusive with `groupBy` (parser-enforced). */
  label?: string;
}

export const DEFAULT_QUERY: Query = {
  fn: "count",
  field: "signal",
  filters: [],
  groupBy: [],
};

/** Pick the right default field for a given aggregator — count uses
 *  `signal`, everything else falls back to `value`. Used when the builder
 *  swaps aggregators so the field stays valid without manual fixup. */
export function defaultFieldFor(fn: Aggregator): FieldName {
  return ROW_COUNT_AGGS.has(fn) ? COUNT_FIELD : "value";
}

/** Render the AST to canonical MQL v0.2 (method-chain syntax). Same-
 *  column equality predicates collapse into one `.where(col in (...))`
 *  call so the OR semantics are visible in the serialized form. Mirrors
 *  the Python parser's grammar — round-trips losslessly. */
export function serializeQuery(q: Query): string {
  let out = `${q.fn}(${q.field})`;

  if (q.filters.length > 0) {
    // Group predicates by column AND op: a single `=` renders as `col = "x"`,
    // multiple as `col in (...)`; a single `!=` as `col != "x"`, multiple as
    // `col not in (...)`. Keying on `column|op` keeps each op's run together so
    // the serialized form round-trips through parseQuery losslessly. Insertion
    // order is preserved so the chip sequence maps 1:1 to the clauses.
    const byColOp: Map<string, Predicate[]> = new Map();
    for (const p of q.filters) {
      const key = `${p.column}|${p.op}`;
      const list = byColOp.get(key) ?? [];
      list.push(p);
      byColOp.set(key, list);
    }
    for (const preds of byColOp.values()) {
      const { column: col, op } = preds[0];
      const vals = preds.map((p) => escapeString(p.value));
      let inner: string;
      if (preds.length === 1) {
        inner = `${col} ${op} ${vals[0]}`;
      } else {
        inner = `${col} ${op === "!=" ? "not in" : "in"} (${vals.join(", ")})`;
      }
      out += `.where(${inner})`;
    }
  }

  if (q.groupBy.length > 0) {
    out += `.by(${q.groupBy.join(", ")})`;
  }

  if (q.reject) {
    out += `.reject(${serializeReject(q.reject)})`;
  }

  if (q.rollup) {
    out += `.every(${q.rollup})`;
  }

  if (q.fill) {
    out += `.fill(${q.fill})`;
  }

  // Right-assignment names the result series (and exposes it as a variable).
  // A bare identifier — it doubles as the variable name in expression lines.
  if (q.label) {
    out += ` -> ${q.label}`;
  }

  return out;
}

/** Render a reject tree to canonical text. Precedence is `or` < `and`; a
 *  child is parenthesized only when its operator binds looser than the
 *  parent's, so the output round-trips through `parseQuery` losslessly
 *  without gratuitous parens. */
function serializeReject(n: RejectNode, parentPrec = 0): string {
  switch (n.kind) {
    case "cmp":
      return `${n.metric} ${n.op} ${n.threshold}`;
    case "range":
      return `${n.metric} ${n.inside ? "between" : "outside"} (${n.lo}, ${n.hi})`;
    case "bool": {
      const prec = n.op === "or" ? 1 : 2;
      const inner = `${serializeReject(n.left, prec)} ${n.op} ${serializeReject(n.right, prec)}`;
      return prec < parentPrec ? `(${inner})` : inner;
    }
  }
}

function escapeString(s: string): string {
  // v0 grammar doesn't define escapes, but a stray `"` would still break
  // parsing. Strip them defensively — signal names don't legitimately
  // contain double quotes, and surfacing a parse error to the user for a
  // value they entered via a picker would be confusing.
  return `"${s.replace(/"/g, "")}"`;
}

// ---------------------------------------------------------------------------
// Parser (text → AST) — mirror of query_lang.py's recursive-descent parser.
//
// The chip builder writes MQL via serializeQuery; the raw MQL editor lets the
// user edit that text directly. parseQuery turns edited text back into the AST
// so both surfaces stay two views of the same Query. Errors carry a 0-based
// column so the editor can point at the offending character — the same
// {message, position} shape the backend returns on a 400.
// ---------------------------------------------------------------------------

export interface ParseError {
  message: string;
  position: number;
}

export type ParseResult =
  | { ok: true; query: Query }
  | { ok: false; error: ParseError };

type TokKind =
  | "string"
  | "interval"
  | "number"
  | "op"
  | "arrow"
  | "ident"
  | "punct";

interface MqlToken {
  kind: TokKind;
  value: string;
  pos: number;
}

// Mirror of _TOKEN_RX. Order matters: interval before number (so `100ms`
// keeps its unit), `->` before number (so the `-` isn't read as a sign) and
// before the comparison ops, two-char comparison ops before single-char.
const TOKEN_RX =
  /\s+|("(?:[^"\\]|\\.)*")|(\d+(?:ms|[smhd]))|(->)|(-?\d+(?:\.\d+)?)|(>=|<=|!=|>|<|=)|([A-Za-z_][A-Za-z0-9_]*)|([().,])/y;

class MqlParseError extends Error {
  position: number;
  constructor(message: string, position: number) {
    super(message);
    this.position = position;
  }
}

function tokenizeMql(s: string): MqlToken[] {
  const out: MqlToken[] = [];
  let i = 0;
  TOKEN_RX.lastIndex = 0;
  while (i < s.length) {
    TOKEN_RX.lastIndex = i;
    const m = TOKEN_RX.exec(s);
    if (!m || m.index !== i) {
      throw new MqlParseError(`unexpected character '${s[i]}'`, i);
    }
    const [, str, interval, arrow, num, op, ident, punct] = m;
    if (str !== undefined) out.push({ kind: "string", value: str.slice(1, -1), pos: i });
    else if (interval !== undefined) out.push({ kind: "interval", value: interval, pos: i });
    else if (arrow !== undefined) out.push({ kind: "arrow", value: arrow, pos: i });
    else if (num !== undefined) out.push({ kind: "number", value: num, pos: i });
    else if (op !== undefined) out.push({ kind: "op", value: op, pos: i });
    else if (ident !== undefined) out.push({ kind: "ident", value: ident, pos: i });
    else if (punct !== undefined) out.push({ kind: "punct", value: punct, pos: i });
    // else: whitespace match — skip.
    i = TOKEN_RX.lastIndex;
  }
  return out;
}

class MqlCursor {
  constructor(private toks: MqlToken[], private src: string) {}
  i = 0;
  get eof(): boolean {
    return this.i >= this.toks.length;
  }
  peek(): MqlToken | null {
    return this.eof ? null : this.toks[this.i];
  }
  advance(): MqlToken {
    return this.toks[this.i++];
  }
  tailPos(): number {
    return this.src.length;
  }
  expectIdent(): MqlToken {
    const t = this.peek();
    if (!t || t.kind !== "ident")
      throw new MqlParseError("expected an identifier", t ? t.pos : this.tailPos());
    return this.advance();
  }
  expectPunct(p: string): MqlToken {
    const t = this.peek();
    if (!t || t.kind !== "punct" || t.value !== p)
      throw new MqlParseError(`expected '${p}'`, t ? t.pos : this.tailPos());
    return this.advance();
  }
}

const AGG_SET = new Set<string>(AGGREGATORS.map((a) => a.value));
const FILTERABLE_SET = new Set<string>(FILTERABLE_COLUMNS);
const GROUPABLE_SET = new Set<string>(GROUPABLE_COLUMNS);
const ROLLUP_SET = new Set<string>(ROLLUP_INTERVALS);
const FILL_SET = new Set<string>(FILL_MODES);
const REJECT_METRIC_SET = new Set<string>(REJECT_METRICS);
const COMPARISON_OPS = new Set<ComparisonOp>([">", ">=", "<", "<=", "=", "!="]);
const RENAMED_METHODS: Record<string, string> = { rollup: "every" };
const METHODS = new Set(["where", "by", "every", "reject", "fill"]);

/** Parse an MQL string into a validated Query AST. Never throws — returns a
 *  result object with a {message, position} error on failure. */
export function parseQuery(input: string): ParseResult {
  const s = input.trim();
  if (!s) return { ok: false, error: { message: "query is empty", position: 0 } };
  try {
    const c = new MqlCursor(tokenizeMql(input), input);
    const { fn, field } = parseAggCall(c);

    const filters: Predicate[] = [];
    const groupBy: GroupColumn[] = [];
    let rollup: Rollup | undefined;
    let reject: RejectNode | undefined;
    let fill: FillMode | undefined;
    let label: string | undefined;
    let labelPos = 0;

    while (!c.eof) {
      const dot = c.peek()!;
      // `-> name` ends the chain: a right-assignment naming the result series.
      if (dot.kind === "arrow") break;
      if (dot.kind !== "punct" || dot.value !== ".") {
        throw new MqlParseError(
          `unexpected '${dot.value}' — methods are chained with '.'`,
          dot.pos,
        );
      }
      c.advance();
      const methodTok = c.expectIdent();
      const method = methodTok.value.toLowerCase();
      if (RENAMED_METHODS[method])
        throw new MqlParseError(`'.${method}' was renamed to '.${RENAMED_METHODS[method]}'`, methodTok.pos);
      if (!METHODS.has(method))
        throw new MqlParseError(
          `unknown method '.${methodTok.value}'; expected one of ` +
            [...METHODS].sort().map((m) => `.${m}`).join(", "),
          methodTok.pos,
        );
      c.expectPunct("(");
      if (method === "where") filters.push(...parseWhereArgs(c));
      else if (method === "by") groupBy.push(...parseByArgs(c));
      else if (method === "every") {
        if (rollup) throw new MqlParseError("'.every' specified more than once", methodTok.pos);
        rollup = parseEveryArgs(c);
      } else if (method === "reject") {
        if (reject) throw new MqlParseError("'.reject' specified more than once", methodTok.pos);
        reject = parseRejectOr(c);
      } else if (method === "fill") {
        if (fill) throw new MqlParseError("'.fill' specified more than once", methodTok.pos);
        fill = parseFillArgs(c);
      }
      c.expectPunct(")");
    }

    // Optional `-> name` right-assignment after the method chain. The name is a
    // bare identifier so it doubles as a referenceable variable.
    if (!c.eof) {
      const arrow = c.advance();
      labelPos = arrow.pos;
      const nameTok = c.peek();
      if (!nameTok || nameTok.kind !== "ident")
        throw new MqlParseError("expected a variable name after '->'", nameTok ? nameTok.pos : c.tailPos());
      c.advance();
      label = nameTok.value;
      if (!c.eof) {
        const extra = c.peek()!;
        throw new MqlParseError(`unexpected '${extra.value}' after '-> ${label}'`, extra.pos);
      }
    }

    // A grouped query already names each series by its group value, so naming a
    // single result with `->` would be ambiguous — reject the combination.
    if (label !== undefined && groupBy.length > 0)
      throw new MqlParseError(
        "'->' can't be combined with '.by'; a breakdown is already labeled by its group values",
        labelPos,
      );

    return { ok: true, query: { fn, field, filters, groupBy, rollup, reject, fill, label } };
  } catch (e) {
    if (e instanceof MqlParseError) return { ok: false, error: { message: e.message, position: e.position } };
    return { ok: false, error: { message: e instanceof Error ? e.message : "parse error", position: 0 } };
  }
}

function parseAggCall(c: MqlCursor): { fn: Aggregator; field: FieldName } {
  const fnTok = c.expectIdent();
  const fn = fnTok.value.toLowerCase();
  if (!AGG_SET.has(fn))
    throw new MqlParseError(
      `unknown function '${fnTok.value}'; expected one of ` +
        AGGREGATORS.map((a) => a.value).join(", "),
      fnTok.pos,
    );
  c.expectPunct("(");
  const fieldTok = c.expectIdent();
  const field = fieldTok.value.toLowerCase();
  c.expectPunct(")");

  const allFields = new Set<string>([COUNT_FIELD, ...NUMERIC_FIELDS]);
  if (!allFields.has(field))
    throw new MqlParseError(`unknown field '${fieldTok.value}'`, fieldTok.pos);
  const needsNumeric = !ROW_COUNT_AGGS.has(fn as Aggregator);
  if (needsNumeric && !NUMERIC_FIELDS.includes(field as FieldName))
    throw new MqlParseError(
      `function '${fn}' needs a numeric field (${NUMERIC_FIELDS.join(", ")}), not '${field}'`,
      fieldTok.pos,
    );
  if (!needsNumeric && field !== COUNT_FIELD)
    throw new MqlParseError(`function '${fn}' operates on rows; use '${COUNT_FIELD}'`, fieldTok.pos);
  return { fn: fn as Aggregator, field: field as FieldName };
}

function parseWhereArgs(c: MqlCursor): Predicate[] {
  const colTok = c.expectIdent();
  const col = colTok.value.toLowerCase();
  if (!FILTERABLE_SET.has(col))
    throw new MqlParseError(`can't filter on '${colTok.value}'`, colTok.pos);
  let t = c.peek();
  // `not in (...)` — negated membership.
  let negatedIn = false;
  if (t && t.kind === "ident" && t.value.toLowerCase() === "not") {
    c.advance();
    const inTok = c.peek();
    if (!inTok || inTok.kind !== "ident" || inTok.value.toLowerCase() !== "in")
      throw new MqlParseError("expected 'in' after 'not'", inTok ? inTok.pos : c.tailPos());
    negatedIn = true;
    t = inTok;
  }
  if (t && t.kind === "ident" && t.value.toLowerCase() === "in") {
    c.advance();
    c.expectPunct("(");
    const vals = parseStringList(c);
    c.expectPunct(")");
    const op = negatedIn ? ("!=" as const) : ("=" as const);
    return vals.map((v) => ({ column: col as FilterColumn, op, value: v }));
  }
  if (t && t.kind === "op" && (t.value === "=" || t.value === "!=")) {
    c.advance();
    const valTok = c.peek();
    if (!valTok || valTok.kind !== "string")
      throw new MqlParseError('expected a quoted string (e.g. "ecu_acc_pedal")', valTok ? valTok.pos : c.tailPos());
    c.advance();
    return [{ column: col as FilterColumn, op: t.value as "=" | "!=", value: valTok.value }];
  }
  throw new MqlParseError("expected '=', '!=', 'in', or 'not in'", t ? t.pos : c.tailPos());
}

function parseStringList(c: MqlCursor): string[] {
  const out: string[] = [];
  for (;;) {
    const t = c.peek();
    if (!t || t.kind !== "string")
      throw new MqlParseError("expected a quoted string", t ? t.pos : c.tailPos());
    c.advance();
    out.push(t.value);
    const nxt = c.peek();
    if (nxt && nxt.kind === "punct" && nxt.value === ",") {
      c.advance();
      continue;
    }
    break;
  }
  return out;
}

function parseByArgs(c: MqlCursor): GroupColumn[] {
  const cols: GroupColumn[] = [];
  for (;;) {
    const colTok = c.expectIdent();
    const col = colTok.value.toLowerCase();
    if (!GROUPABLE_SET.has(col))
      throw new MqlParseError(`can't group by '${colTok.value}'`, colTok.pos);
    cols.push(col as GroupColumn);
    const nxt = c.peek();
    if (nxt && nxt.kind === "punct" && nxt.value === ",") {
      c.advance();
      continue;
    }
    break;
  }
  return cols;
}

function parseEveryArgs(c: MqlCursor): Rollup {
  const t = c.peek();
  if (!t || t.kind !== "interval")
    throw new MqlParseError("expected an interval (e.g. 1m, 10s, 1h)", t ? t.pos : c.tailPos());
  c.advance();
  if (!ROLLUP_SET.has(t.value))
    throw new MqlParseError(`invalid interval '${t.value}'; valid: ${ROLLUP_INTERVALS.join(", ")}`, t.pos);
  return t.value as Rollup;
}

function parseFillArgs(c: MqlCursor): FillMode {
  const t = c.expectIdent();
  const mode = t.value.toLowerCase();
  if (!FILL_SET.has(mode))
    throw new MqlParseError(`invalid fill mode '${t.value}'; valid: ${FILL_MODES.join(", ")}`, t.pos);
  return mode as FillMode;
}

function parseRejectOr(c: MqlCursor): RejectNode {
  let left = parseRejectAnd(c);
  for (;;) {
    const t = c.peek();
    if (t && t.kind === "ident" && t.value.toLowerCase() === "or") {
      c.advance();
      left = { kind: "bool", op: "or", left, right: parseRejectAnd(c) };
    } else return left;
  }
}

function parseRejectAnd(c: MqlCursor): RejectNode {
  let left = parseRejectCmp(c);
  for (;;) {
    const t = c.peek();
    if (t && t.kind === "ident" && t.value.toLowerCase() === "and") {
      c.advance();
      left = { kind: "bool", op: "and", left, right: parseRejectCmp(c) };
    } else return left;
  }
}

function parseRejectCmp(c: MqlCursor): RejectNode {
  const t = c.peek();
  if (t && t.kind === "punct" && t.value === "(") {
    c.advance();
    const inner = parseRejectOr(c);
    c.expectPunct(")");
    return inner;
  }
  const metricTok = c.expectIdent();
  const metric = metricTok.value.toLowerCase();
  if (!REJECT_METRIC_SET.has(metric))
    throw new MqlParseError(`can't reject on '${metricTok.value}'`, metricTok.pos);
  const nxt = c.peek();
  if (nxt && nxt.kind === "ident" && (nxt.value.toLowerCase() === "between" || nxt.value.toLowerCase() === "outside")) {
    const kw = c.advance();
    if (metric === "sigma")
      throw new MqlParseError("'sigma' ranges aren't meaningful; use 'sigma > N'", kw.pos);
    c.expectPunct("(");
    const lo = parseRejectNumber(c);
    c.expectPunct(",");
    const hi = parseRejectNumber(c);
    c.expectPunct(")");
    return { kind: "range", metric: metric as "value" | "raw_value", lo, hi, inside: kw.value.toLowerCase() === "between" };
  }
  if (!nxt || nxt.kind !== "op")
    throw new MqlParseError("expected a comparison (e.g. value > 100) or 'between'/'outside'", nxt ? nxt.pos : c.tailPos());
  if (!COMPARISON_OPS.has(nxt.value as ComparisonOp))
    throw new MqlParseError(`invalid comparison operator '${nxt.value}'`, nxt.pos);
  c.advance();
  const threshold = parseRejectNumber(c);
  return { kind: "cmp", metric: metric as RejectMetric, op: nxt.value as ComparisonOp, threshold };
}

function parseRejectNumber(c: MqlCursor): number {
  const t = c.peek();
  if (!t || t.kind !== "number")
    throw new MqlParseError("expected a number", t ? t.pos : c.tailPos());
  c.advance();
  return parseFloat(t.value);
}

/** True when a statement reads as a fetch query (`<agg>(...)…`) rather than a
 *  derived expression (`s0 / s1`, `current_ac^2`). Used by the widget to route
 *  each trace line: fetch queries hit /query/run, expressions evaluate
 *  in-browser via lib/expr.ts. A fetch query always begins with a known
 *  aggregator immediately followed by `(`; anything else is an expression. */
export function looksLikeFetchQuery(input: string): boolean {
  const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(/.exec(input);
  return m !== null && AGG_SET.has(m[1].toLowerCase());
}

/** Split a trailing `-> name` right-assignment off a line, returning the body
 *  and the assigned variable name (a bare identifier). Used for EXPRESSION
 *  lines, which don't pass through parseQuery — fetch lines carry `->` inside
 *  the MQL grammar instead. No arrow → `{ body: line, name: undefined }`. */
export function splitAssignment(line: string): { body: string; name?: string } {
  const m = /^(.*?)\s*->\s*([A-Za-z_][A-Za-z0-9_]*)\s*$/.exec(line);
  if (!m) return { body: line };
  return { body: m[1], name: m[2] };
}

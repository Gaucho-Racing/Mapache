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
  "16ms", "50ms", "100ms", "500ms",
  "1s", "10s", "30s",
  "1m", "5m", "15m", "30m",
  "1h", "2h", "6h",
  "1d",
] as const;
export type Rollup = (typeof ROLLUP_INTERVALS)[number];

export interface Predicate {
  column: FilterColumn;
  op: "=";
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
    // Group same-column equality predicates: a single value renders as
    // `col = "x"`, multiple values as `col in ("a", "b", ...)`. We
    // preserve the order each column was first introduced so the chip
    // sequence in the builder maps 1:1 to the serialized clauses.
    const byCol: Map<FilterColumn, Predicate[]> = new Map();
    for (const p of q.filters) {
      const list = byCol.get(p.column) ?? [];
      list.push(p);
      byCol.set(p.column, list);
    }
    for (const [col, preds] of byCol) {
      const inner =
        preds.length === 1
          ? `${col} = ${escapeString(preds[0].value)}`
          : `${col} in (${preds.map((p) => escapeString(p.value)).join(", ")})`;
      out += `.where(${inner})`;
    }
  }

  if (q.groupBy.length > 0) {
    out += `.by(${q.groupBy.join(", ")})`;
  }

  if (q.rollup) {
    out += `.every(${q.rollup})`;
  }

  return out;
}

function escapeString(s: string): string {
  // v0 grammar doesn't define escapes, but a stray `"` would still break
  // parsing. Strip them defensively — signal names don't legitimately
  // contain double quotes, and surfacing a parse error to the user for a
  // value they entered via a picker would be confusing.
  return `"${s.replace(/"/g, "")}"`;
}

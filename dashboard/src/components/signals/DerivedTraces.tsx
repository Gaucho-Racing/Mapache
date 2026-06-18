import { Input } from "@/components/ui/input";
import { DERIVED_KEY, seriesLabel, type Series } from "./QueryChart";
import { compileExpression, type DerivedTrace } from "@/lib/expr";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";

// Variable model: each series is referenceable by a positional alias
// (`s0, s1, …`, always present). On top of that it may carry:
//   - an explicit name from a `-> name` label (e.g. `power -> p`), which is a
//     first-class, validated variable — referencing an undeclared name or
//     declaring the same name twice is a compile error, never a silent flat
//     line; and
//   - a friendly alias auto-derived from the series label (e.g. `current_ac`)
//     when that label sanitizes to a unique identifier AND no explicit name was
//     given. The explicit name takes precedence so the two never fight.

/** A series paired with an optional explicit variable name from `-> name`.
 *  Plain `Series[]` is still accepted everywhere a `NamedSeries[]` is (the name
 *  defaults to absent), keeping every existing caller working unchanged. */
export interface NamedSeries {
  series: Series;
  /** Explicit `-> name` identifier, or undefined for an unnamed series. */
  name?: string;
}

export interface SeriesVariable {
  /** Positional alias — always present. */
  index: string;
  /** Explicit `-> name` alias, or null when the series wasn't named. */
  name: string | null;
  /** Friendly label-derived alias, or null when absent/superseded by `name`. */
  friendly: string | null;
  /** Human label of the underlying series (for the hint UI). */
  label: string;
}

/** Normalize the `Series[] | NamedSeries[]` overload into `NamedSeries[]`. A
 *  `Series` has `tags`/`points` and never a `series` key, so that key uniquely
 *  distinguishes the wrapped form. */
function toNamedSeries(input: Series[] | NamedSeries[]): NamedSeries[] {
  return (input as Array<Series | NamedSeries>).map((s) =>
    "series" in s ? s : { series: s },
  );
}

/** Sanitize a series label to a candidate identifier, or null if nothing valid
 *  survives or it starts with a digit. */
function sanitizeIdent(label: string): string | null {
  const cleaned = label
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (cleaned === "") return null;
  if (/^[0-9]/.test(cleaned)) return null;
  return cleaned;
}

/** Build the variable table over a list of series. Each entry always exposes a
 *  positional `sN` alias. An explicit `-> name` (when present) is exposed as-is.
 *  A label-derived friendly alias is assigned only when the series has no
 *  explicit name, the candidate is unique across the set, and it doesn't collide
 *  with a positional alias; else `sN` only. */
export function buildSeriesVariables(
  input: Series[] | NamedSeries[],
): SeriesVariable[] {
  const named = toNamedSeries(input);
  const candidates = named.map((n) => sanitizeIdent(seriesLabel(n.series.tags)));
  const counts = new Map<string, number>();
  for (const c of candidates) {
    if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  const positional = new Set(named.map((_, i) => `s${i}`));

  return named.map((n, i) => {
    const cand = candidates[i];
    // The explicit name owns the slot; only fall back to the label heuristic
    // when there's no name, so a `-> name` is never shadowed by its own label.
    const hasName = n.name != null && n.name !== "";
    const unique =
      !hasName && cand !== null && counts.get(cand) === 1 && !positional.has(cand);
    return {
      index: `s${i}`,
      name: hasName ? (n.name as string) : null,
      friendly: unique ? cand : null,
      label: seriesLabel(n.series.tags),
    };
  });
}

/** Compile an expression against the base series, with the shared variable
 *  model and unknown-variable validation used by both derived traces and
 *  highlights. On success returns a per-bucket evaluator `evalAt(i)`. */
export interface SeriesEvaluator {
  ok: boolean;
  /** Present when `!ok` — already formatted for inline display. */
  error?: string;
  /** Present when `ok`. Evaluate the expression at a given bucket index. */
  evalAt?: (bucketIndex: number) => number;
}

/** An additional per-bucket variable source merged into the evaluator's vars,
 *  beyond the base-series aliases. Its `names` are added to the known-variable
 *  set (so referencing them passes validation) and `valueAt(i)` supplies their
 *  values at bucket index `i`. Powers the `lap` pseudo-variable in highlights. */
export interface ExtraVariables {
  names: string[];
  valueAt: (bucketIndex: number) => Record<string, number>;
}

export function compileAgainstSeries(
  expression: string,
  input: Series[] | NamedSeries[],
  extra?: ExtraVariables,
): SeriesEvaluator {
  const named = toNamedSeries(input);

  // Reject duplicate `-> name` labels before parsing: two series claiming the
  // same name would make any reference to it ambiguous, so surface it as a
  // compile error rather than silently letting the last one win.
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const n of named) {
    if (n.name == null || n.name === "") continue;
    if (seen.has(n.name)) dupes.add(n.name);
    seen.add(n.name);
  }
  if (dupes.size > 0) {
    const list = [...dupes].join(", ");
    return {
      ok: false,
      error: `Duplicate series name${dupes.size === 1 ? "" : "s"}: ${list}`,
    };
  }

  const result = compileExpression(expression);
  if (!result.ok || !result.compiled) {
    const err = result.error;
    return {
      ok: false,
      error: err
        ? `${err.message} (col ${err.position + 1})`
        : "Invalid expression",
    };
  }

  const variables = buildSeriesVariables(named);

  // Validate referenced variables up-front so a typo'd alias is a clear
  // message instead of a silently flat (all-zero) line / empty highlight.
  const known = new Set<string>();
  for (const v of variables) {
    known.add(v.index);
    if (v.name) known.add(v.name);
    if (v.friendly) known.add(v.friendly);
  }
  if (extra) for (const name of extra.names) known.add(name);
  const unknown = result.compiled.variables.filter((v) => !known.has(v));
  if (unknown.length > 0) {
    return {
      ok: false,
      error: `Unknown variable${unknown.length === 1 ? "" : "s"}: ${unknown.join(", ")}`,
    };
  }

  const compiled = result.compiled;
  const evalAt = (i: number): number => {
    // Each series contributes its value at `i` under every alias it carries
    // (positional, explicit name, and/or label-derived friendly).
    const vars: Record<string, number> = {};
    for (let si = 0; si < named.length; si++) {
      const value = named[si].series.points[i]?.value ?? 0;
      vars[`s${si}`] = value;
      const { name, friendly } = variables[si];
      if (name) vars[name] = value;
      if (friendly) vars[friendly] = value;
    }
    if (extra) Object.assign(vars, extra.valueAt(i));
    return compiled.evaluate(vars);
  };

  return { ok: true, evalAt };
}

/** Result of evaluating one derived trace: either the computed series or a
 *  per-trace error message to surface inline. */
export interface DerivedResult {
  id: string;
  series?: Series;
  error?: string;
}

/** Compute derived series from the base series + the user's traces. Each trace
 *  is compiled once then evaluated per bucket; unknown refs and non-finite
 *  results yield null points rather than throwing. */
export function computeDerivedSeries(
  series: Series[],
  traces: (DerivedTrace & { name?: string })[],
): DerivedResult[] {
  // Shared (server-zero-filled) bucket axis; the derived series reuse it.
  const buckets = series[0]?.points.map((p) => p.bucket) ?? [];

  // Growing pool: each named result is appended (carrying its explicit `->
  // name`) so a later expression can reference it as a first-class variable
  // (`power -> p`, `torque -> t`, then `p / t -> ratio`). Base series enter
  // unnamed and keep their label-derived friendly aliases.
  const pool: NamedSeries[] = series.map((s) => ({ series: s }));

  // Names already claimed by an earlier trace, so a second `-> x` is flagged on
  // the row that introduces the clash (the pool only sees a duplicate one trace
  // later, which would miss a final two-trace collision).
  const claimedNames = new Set<string>();

  return traces.map((trace) => {
    const label = trace.label.trim() || trace.expression.trim() || "derived";

    if (trace.expression.trim() === "") {
      return { id: trace.id }; // skip empty rows mid-edit
    }

    if (trace.name && claimedNames.has(trace.name)) {
      return {
        id: trace.id,
        error: `Duplicate series name: ${trace.name}`,
      };
    }

    const evaluator = compileAgainstSeries(trace.expression, pool);
    if (!evaluator.ok || !evaluator.evalAt) {
      return { id: trace.id, error: evaluator.error };
    }

    const evalAt = evaluator.evalAt;
    const points = buckets.map((bucket, i) => {
      const out = evalAt(i);
      // NaN (div-by-zero, etc.) → null; the chart coerces null → 0.
      return { bucket, value: Number.isFinite(out) ? out : null };
    });

    const computed: Series = { tags: { [DERIVED_KEY]: label }, points };
    if (trace.name) {
      pool.push({ series: computed, name: trace.name });
      claimedNames.add(trace.name);
    }
    return { id: trace.id, series: computed };
  });
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

let traceSeq = 0;
function newTraceId(): string {
  traceSeq += 1;
  return `dt_${traceSeq}_${Date.now().toString(36)}`;
}

interface DerivedTracesProps {
  traces: DerivedTrace[];
  onChange: (next: DerivedTrace[]) => void;
  /** Variables available to reference, shown as a hint. */
  variables: SeriesVariable[];
  /** Per-trace parse/eval errors keyed by trace id. */
  errors: Record<string, string>;
}

/** Compact editor for derived/expression traces. */
export function DerivedTraces({
  traces,
  onChange,
  variables,
  errors,
}: DerivedTracesProps) {
  function add() {
    onChange([
      ...traces,
      { id: newTraceId(), label: "", expression: "" },
    ]);
  }

  function update(id: string, patch: Partial<DerivedTrace>) {
    onChange(traces.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function remove(id: string) {
    onChange(traces.filter((t) => t.id !== id));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="select-none text-xs font-medium text-muted-foreground">
          Derived traces
        </span>
        {traces.length === 0 ? (
          <span className="select-none text-xs italic text-muted-foreground/60">
            none
          </span>
        ) : null}
      </div>

      {traces.map((trace) => (
        <div key={trace.id} className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Input
              value={trace.label}
              onChange={(e) => update(trace.id, { label: e.target.value })}
              placeholder="label"
              className="h-7 w-32 font-mono text-xs"
            />
            <span className="select-none text-xs text-muted-foreground/70">
              =
            </span>
            <Input
              value={trace.expression}
              onChange={(e) => update(trace.id, { expression: e.target.value })}
              placeholder="expression (e.g. s0 * 2)"
              className="h-7 flex-1 font-mono text-xs"
            />
            <button
              type="button"
              aria-label="Remove derived trace"
              onClick={() => remove(trace.id)}
              className="rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              title="Remove derived trace"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {errors[trace.id] ? (
            <p className="pl-1 text-xs text-destructive">{errors[trace.id]}</p>
          ) : null}
        </div>
      ))}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={add}
          className={cn(
            "inline-flex h-7 items-center gap-1 rounded-md border border-dashed bg-transparent px-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent/40 hover:text-foreground",
          )}
        >
          <Plus className="h-3 w-3" />
          derived trace
        </button>
      </div>

      {variables.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground/70">
          <span className="uppercase tracking-wider">vars</span>
          {variables.map((v) => {
            const alias = v.name ?? v.friendly;
            return (
              <code key={v.index} className="font-mono">
                {alias ? `${v.index} = ${alias}` : v.index}
              </code>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

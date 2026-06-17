import { Input } from "@/components/ui/input";
import { type Series } from "./QueryChart";
import {
  compileAgainstSeries,
  type ExtraVariables,
  type SeriesVariable,
} from "./DerivedTraces";
import type { Lap } from "@/models/session";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";

/** The pseudo-variable name exposed to highlight conditions when laps are
 *  available, e.g. `lap % 2 = 1`. */
export const LAP_VAR = "lap";

/** Build a per-bucket `lap` extra-variable from a session's laps. Maps each
 *  bucket index to the lap_number whose [start_time, end_time] contains the
 *  bucket's timestamp. Bucket timestamps are sorted ascending, so a single
 *  pointer advances over the (lap_number-ordered) laps — O(buckets + laps).
 *  Buckets outside any lap resolve to NaN, so `lap % 2 = 1` is simply false
 *  there (no band). */
function buildLapExtra(series: Series[], laps: Lap[]): ExtraVariables | null {
  const buckets = series[0]?.points ?? [];
  if (buckets.length === 0 || laps.length === 0) return null;

  const ordered = [...laps].sort((a, b) => a.lap_number - b.lap_number);
  const lapByBucket = new Array<number>(buckets.length).fill(NaN);

  let lapIdx = 0;
  for (let i = 0; i < buckets.length; i++) {
    const t = new Date(buckets[i].bucket).getTime();
    // Advance past laps that ended before this bucket's timestamp.
    while (lapIdx < ordered.length && new Date(ordered[lapIdx].end_time).getTime() < t) {
      lapIdx++;
    }
    if (lapIdx >= ordered.length) break;
    const lap = ordered[lapIdx];
    if (t >= new Date(lap.start_time).getTime()) {
      lapByBucket[i] = lap.lap_number;
    }
  }

  return {
    names: [LAP_VAR],
    valueAt: (i) => ({ [LAP_VAR]: lapByBucket[i] }),
  };
}

// ---------------------------------------------------------------------------
// Highlight regions (T6)
//
// A highlight shades the bucket ranges of THIS widget's chart where a boolean
// condition holds — e.g. `throttle = 100` paints translucent vertical bands
// over the times throttle is pinned. Detection runs entirely in-browser by
// reusing the safe expression evaluator (a condition is just an expression read
// as truthy, `!= 0`). Per-widget and local: nothing is broadcast across panels.
// ---------------------------------------------------------------------------

/** One user-defined highlight: a boolean condition + the band color to paint
 *  wherever it holds. */
export interface Highlight {
  /** Stable id (for React keys / state updates). */
  id: string;
  /** Boolean condition over base-series variables (e.g. `throttle >= 100`). */
  expression: string;
  /** Translucent band color (a value from `HIGHLIGHT_COLORS`). */
  color: string;
}

/** A small palette of translucent band colors. Kept low-alpha so bands read as
 *  background wash behind the data lines/bars rather than competing with them.
 *  Default (first) is red — the canonical "this is the interesting region" hue. */
export const HIGHLIGHT_COLORS: { name: string; value: string }[] = [
  { name: "red", value: "rgba(239, 68, 68, 0.18)" },
  { name: "amber", value: "rgba(245, 158, 11, 0.18)" },
  { name: "green", value: "rgba(16, 185, 129, 0.18)" },
  { name: "blue", value: "rgba(59, 130, 246, 0.18)" },
];

export const DEFAULT_HIGHLIGHT_COLOR = HIGHLIGHT_COLORS[0].value;

/** The computed bands for one highlight: contiguous truthy bucket indices
 *  coalesced into inclusive `[startIdx, endIdx]` index ranges. */
export interface HighlightRanges {
  id: string;
  color: string;
  ranges: [number, number][];
}

/** Pure evaluation in a single pass: for each highlight, compile its condition
 *  ONCE against the series (via the shared `compileAgainstSeries` helper),
 *  evaluate per bucket index, coalesce contiguous truthy buckets into inclusive
 *  index ranges the chart paints as bands, AND collect any compile/unknown-
 *  variable error for inline display in the editor. A failing condition yields
 *  empty ranges + an error; NaN / falsey buckets break a run. Returning both
 *  from one call avoids compiling each expression twice. */
export function evaluateHighlights(
  series: Series[],
  highlights: Highlight[],
  laps?: Lap[] | null,
): { ranges: HighlightRanges[]; errors: Record<string, string> } {
  // Shared bucket axis (server zero-fills every series), so the first series
  // defines how many bucket indices there are to walk.
  const bucketCount = series[0]?.points.length ?? 0;
  const errors: Record<string, string> = {};

  // When laps are present, expose a per-bucket `lap` pseudo-variable so
  // conditions like `lap % 2 = 1` (alternate by lap) work.
  const lapExtra = laps && laps.length > 0 ? buildLapExtra(series, laps) : null;

  const ranges = highlights.map((h): HighlightRanges => {
    if (h.expression.trim() === "") {
      // Empty condition mid-edit — no bands, no error.
      return { id: h.id, color: h.color, ranges: [] };
    }

    const evaluator = compileAgainstSeries(h.expression, series, lapExtra ?? undefined);
    if (!evaluator.ok || !evaluator.evalAt) {
      // Compile / unknown-variable error → no bands; surface why in the editor.
      if (evaluator.error) errors[h.id] = evaluator.error;
      return { id: h.id, color: h.color, ranges: [] };
    }

    const evalAt = evaluator.evalAt;
    const bands: [number, number][] = [];
    let runStart: number | null = null;
    for (let i = 0; i < bucketCount; i++) {
      const v = evalAt(i);
      // Truthy = finite and non-zero. NaN (undefined condition) is falsey.
      const hit = Number.isFinite(v) && v !== 0;
      if (hit) {
        if (runStart === null) runStart = i;
      } else if (runStart !== null) {
        bands.push([runStart, i - 1]);
        runStart = null;
      }
    }
    // Close a run that extends to the last bucket.
    if (runStart !== null) bands.push([runStart, bucketCount - 1]);

    return { id: h.id, color: h.color, ranges: bands };
  });

  return { ranges, errors };
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

let highlightSeq = 0;
function newHighlightId(): string {
  highlightSeq += 1;
  return `hl_${highlightSeq}_${Date.now().toString(36)}`;
}

interface HighlightsProps {
  highlights: Highlight[];
  onChange: (next: Highlight[]) => void;
  /** Variables available to reference, shown as a hint. */
  variables: SeriesVariable[];
  /** Per-highlight parse/unknown-variable errors keyed by id. */
  errors: Record<string, string>;
  /** When true, the `lap` pseudo-variable is available: show the
   *  "alternate by lap" shortcut and list `lap` in the vars hint. */
  lapsAvailable?: boolean;
}

/** Compact editor for highlight regions, styled to match the derived-traces /
 *  query-builder chip/sentence language. Lives below the axis controls. */
export function Highlights({
  highlights,
  onChange,
  variables,
  errors,
  lapsAvailable = false,
}: HighlightsProps) {
  function add(expression = "") {
    onChange([
      ...highlights,
      {
        id: newHighlightId(),
        expression,
        color: DEFAULT_HIGHLIGHT_COLOR,
      },
    ]);
  }

  function update(id: string, patch: Partial<Highlight>) {
    onChange(highlights.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  }

  function remove(id: string) {
    onChange(highlights.filter((h) => h.id !== id));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="select-none text-xs font-medium text-muted-foreground">
          Highlights
        </span>
        {highlights.length === 0 ? (
          <span className="select-none text-xs italic text-muted-foreground/60">
            none
          </span>
        ) : null}
      </div>

      {highlights.map((highlight) => (
        <div key={highlight.id} className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            {/* Color swatch picker — cycle through the preset translucent
                colors. The swatch shows the currently-chosen band hue. */}
            <div className="flex items-center gap-1">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  aria-label={`Highlight color ${c.name}`}
                  title={c.name}
                  onClick={() => update(highlight.id, { color: c.value })}
                  className={cn(
                    "h-4 w-4 rounded-sm border transition-transform hover:scale-110",
                    highlight.color === c.value
                      ? "border-foreground"
                      : "border-transparent",
                  )}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
            <span className="select-none text-xs text-muted-foreground/70">
              when
            </span>
            <Input
              value={highlight.expression}
              onChange={(e) =>
                update(highlight.id, { expression: e.target.value })
              }
              placeholder="condition (e.g. throttle = 100)"
              className="h-7 flex-1 font-mono text-xs"
            />
            <button
              type="button"
              aria-label="Remove highlight"
              onClick={() => remove(highlight.id)}
              className="rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              title="Remove highlight"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {errors[highlight.id] ? (
            <p className="pl-1 text-xs text-destructive">
              {errors[highlight.id]}
            </p>
          ) : null}
        </div>
      ))}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => add()}
          className={cn(
            "inline-flex h-7 items-center gap-1 rounded-md border border-dashed bg-transparent px-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent/40 hover:text-foreground",
          )}
        >
          <Plus className="h-3 w-3" />
          highlight
        </button>
        {lapsAvailable ? (
          <button
            type="button"
            onClick={() => add(`${LAP_VAR} % 2 = 1`)}
            title="Highlight every other lap"
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-md border border-dashed bg-transparent px-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent/40 hover:text-foreground",
            )}
          >
            <Plus className="h-3 w-3" />
            alternate by lap
          </button>
        ) : null}
      </div>

      {variables.length > 0 || lapsAvailable ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground/70">
          <span className="uppercase tracking-wider">vars</span>
          {variables.map((v) => (
            <code key={v.index} className="font-mono">
              {v.friendly ? `${v.index} = ${v.friendly}` : v.index}
            </code>
          ))}
          {lapsAvailable ? <code className="font-mono">{LAP_VAR}</code> : null}
        </div>
      ) : null}
    </div>
  );
}

import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AGGREGATORS,
  type Aggregator,
  COUNT_FIELD,
  defaultFieldFor,
  type FieldName,
  type FillMode,
  FILL_MODES,
  type FilterColumn,
  FILTERABLE_COLUMNS,
  NUMERIC_FIELDS,
  type Predicate,
  type Query,
  type RejectNode,
  type Rollup,
  ROLLUP_INTERVALS,
  ROW_COUNT_AGGS,
  serializeQuery,
} from "@/lib/query";
import { cn } from "@/lib/utils";
import { useTextMirror } from "@/lib/useTextMirror";
import Fuse from "fuse.js";
import { ChevronDown, Plus, Sigma, X } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

/** Per-series summary of the raw samples a `.reject(...)` clause cut before
 *  aggregation. One entry per series (single entry with empty `tags` when the
 *  query has no group-by). Returned by /query/run as `reject_stats`. */
export interface RejectStatsEntry {
  tags: Record<string, string | null>;
  cut_count: number;
  min: number | null;
  max: number | null;
  avg: number | null;
}

interface QueryBuilderProps {
  value: Query;
  onChange: (next: Query) => void;
  /** Signal names for the filter-value autocomplete. */
  signalNames: string[];
  /** Parser/execution error from the most recent run, shown under the preview. */
  error?: { message: string; position?: number } | null;
  /** Cut-summary from the most recent run, shown in the reject chip popover. */
  rejectStats?: RejectStatsEntry[] | null;
  /** Opt-in editable MQL line: when provided, the preview becomes a controlled
   *  `<input>` that calls `onMqlChange` for the parent to re-parse. */
  onMqlChange?: (mql: string) => void;
  /** Focus lifecycle of the editable MQL line — the parent uses these to freeze
   *  the row as a fetch row mid-edit (see SignalWidget's editingRow). */
  onMqlFocus?: () => void;
  onMqlBlur?: () => void;
}

export function QueryBuilder({
  value,
  onChange,
  signalNames,
  error,
  rejectStats,
  onMqlChange,
  onMqlFocus,
  onMqlBlur,
}: QueryBuilderProps) {
  const fieldOptions: FieldName[] = ROW_COUNT_AGGS.has(value.fn)
    ? [COUNT_FIELD]
    : NUMERIC_FIELDS;
  const fieldFixed = fieldOptions.length === 1;

  function setFn(fn: Aggregator) {
    // Swapping aggregator classes (count ↔ avg/sum/...) invalidates the field;
    // reset to the canonical default to keep the AST valid.
    const fieldClassChanged =
      ROW_COUNT_AGGS.has(fn) !== ROW_COUNT_AGGS.has(value.fn);
    onChange({
      ...value,
      fn,
      field: fieldClassChanged ? defaultFieldFor(fn) : value.field,
    });
  }

  function setField(field: FieldName) {
    onChange({ ...value, field });
  }

  function addFilter() {
    onChange({
      ...value,
      filters: [...value.filters, { column: "name", op: "=", value: "" }],
    });
  }

  function updateFilter(i: number, next: Predicate) {
    const filters = [...value.filters];
    filters[i] = next;
    onChange({ ...value, filters });
  }

  function removeFilter(i: number) {
    onChange({
      ...value,
      filters: value.filters.filter((_, idx) => idx !== i),
    });
  }

  // `.by(name)` breakout: on = one series per matching signal, off = one
  // combined series. Clears any label, which can't combine with `.by`.
  const breakout = value.groupBy.length > 0;
  function setBreakout(on: boolean) {
    if (on) {
      const { label: _drop, ...rest } = value;
      onChange({ ...rest, groupBy: ["name"] });
    } else {
      onChange({ ...value, groupBy: [] });
    }
  }

  function setRollup(next: Rollup | undefined) {
    const { rollup: _drop, ...rest } = value;
    onChange(next ? { ...rest, rollup: next } : rest);
  }

  function setReject(next: RejectNode | undefined) {
    const { reject: _drop, ...rest } = value;
    onChange(next ? { ...rest, reject: next } : rest);
  }

  function setFill(next: FillMode | undefined) {
    const { fill: _drop, ...rest } = value;
    onChange(next ? { ...rest, fill: next } : rest);
  }

  function setLabel(next: string | undefined) {
    // Restrict to identifier chars so the `-> name` variable parses.
    const ident = next?.replace(/[^A-Za-z0-9_]/g, "");
    const { label: _drop, ...rest } = value;
    onChange(ident ? { ...rest, label: ident } : rest);
  }

  // Editable MQL line (two-way chips↔text). Local text is the source of truth
  // while typing; re-seed from the serialized AST only on chip-driven changes,
  // never on the user's own keystrokes (which would yank the caret).
  const serialized = serializeQuery(value);
  const [mqlText, onMqlTextChange] = useTextMirror(
    serialized,
    (next) => onMqlChange?.(next),
  );

  // Optional modifier state — used to decide whether each chip renders
  // inline or shows up as an "add me" entry in the Modify menu.
  const activeModifiers = {
    breakout,
    rollup: value.rollup !== undefined,
    reject: value.reject !== undefined,
    fill: value.fill !== undefined,
  };

  // Sensible starting values when a modifier is freshly added from the
  // Modify menu — chosen so the chip renders something useful immediately
  // instead of an empty/placeholder state the user has to click into.
  function addModifier(kind: ModifierKind) {
    if (kind === "breakout") setBreakout(true);
    else if (kind === "rollup") setRollup("1m");
    else if (kind === "reject")
      setReject({ kind: "cmp", metric: "sigma", op: ">", threshold: 3 });
    else if (kind === "fill") setFill("gap");
  }

  return (
    <div className="flex flex-col gap-2.5">
      {/* Series name (serializes to `-> ident`). Always visible so a query
          author can label the result without hunting through a menu. Hidden
          when breaking out by name — a per-group breakdown is already
          labeled by its group values, so `-> name` would be ambiguous. */}
      {!breakout ? (
        <div className="flex items-center gap-2">
          <label className="select-none text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Name series
          </label>
          <Input
            value={value.label ?? ""}
            onChange={(e) => setLabel(e.target.value || undefined)}
            placeholder="unnamed"
            className="h-7 max-w-[220px] font-mono text-xs"
          />
        </div>
      ) : null}

      {/* Datadog-style query row: source pill on the left, filters in the
          middle, aggregator/field/breakout in the middle-right, function
          menu (Σ) on the far right. Reads left-to-right as a single line
          rather than the prior "Show <agg> of <field> where …" sentence. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 leading-7">
        <SourcePill>Signal</SourcePill>

        <Connector>from</Connector>
        {value.filters.length === 0 ? (
          <Hint>all signals</Hint>
        ) : (
          value.filters.map((pred, i) => {
            // Same-column filters combine: matches union ("or"), negations
            // intersect ("and"). Show the connector so it doesn't read ambiguously.
            const prev = i > 0 ? value.filters[i - 1] : null;
            const sameColAsPrev = prev !== null && prev.column === pred.column;
            const connector = pred.op === "!=" ? "and" : "or";
            return (
              <span key={i} className="inline-flex items-center gap-2">
                {sameColAsPrev ? <Connector>{connector}</Connector> : null}
                <FilterChip
                  value={pred}
                  onChange={(next) => updateFilter(i, next)}
                  onRemove={() => removeFilter(i)}
                  signalNames={signalNames}
                />
              </span>
            );
          })
        )}
        <AddChip label="signal" onClick={addFilter} />

        <Divider />

        <SelectChip
          label={value.fn}
          options={AGGREGATORS.map((a) => ({
            value: a.value,
            label: a.label,
          }))}
          onSelect={(v) => setFn(v as Aggregator)}
        />
        <Connector>of</Connector>
        <SelectChip
          label={value.field}
          options={fieldOptions.map((f) => ({ value: f, label: f }))}
          onSelect={(v) => setField(v as FieldName)}
          disabled={fieldFixed}
        />

        {activeModifiers.breakout ? (
          <RemovableClause keyword="by" onRemove={() => setBreakout(false)}>
            <span className="select-none text-xs text-muted-foreground">name</span>
          </RemovableClause>
        ) : null}

        {activeModifiers.rollup ? (
          <RemovableClause keyword="rollup" onRemove={() => setRollup(undefined)}>
            <RollupChip value={value.rollup} onChange={setRollup} />
          </RemovableClause>
        ) : null}

        {activeModifiers.reject ? (
          <RemovableClause keyword="filter" onRemove={() => setReject(undefined)}>
            <RejectChip
              value={value.reject}
              onChange={setReject}
              stats={rejectStats ?? null}
            />
          </RemovableClause>
        ) : null}

        {activeModifiers.fill ? (
          <RemovableClause keyword="fill" onRemove={() => setFill(undefined)}>
            <FillChip value={value.fill} onChange={setFill} />
          </RemovableClause>
        ) : null}

        <ModifyMenu active={activeModifiers} onAdd={addModifier} />
      </div>

      <div className="flex flex-col gap-1 rounded-md border bg-muted/30 px-2.5 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          MQL
        </span>
        {onMqlChange ? (
          <input
            value={mqlText}
            onChange={(e) => onMqlTextChange(e.target.value)}
            onFocus={onMqlFocus}
            onBlur={onMqlBlur}
            spellCheck={false}
            className={cn(
              "block w-full break-all bg-transparent font-mono text-xs text-foreground/80 outline-none",
              error && "text-destructive",
            )}
          />
        ) : (
          <code
            className={cn(
              "block break-all font-mono text-xs text-foreground/80",
              error && "text-destructive",
            )}
          >
            {serialized}
          </code>
        )}
      </div>
      {error ? (
        <p className="text-xs text-destructive">
          {error.message}
          {typeof error.position === "number"
            ? ` (col ${error.position + 1})`
            : ""}
        </p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sentence scaffolding
// ---------------------------------------------------------------------------

/** Clause + an X to remove the whole modifier. The X returns the
 *  corresponding entry to the Modify menu. */
function RemovableClause({
  keyword,
  children,
  onRemove,
}: {
  keyword: string;
  children: ReactNode;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Keyword>{keyword}</Keyword>
      {children}
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex h-4 w-4 items-center justify-center rounded text-muted-foreground/60 hover:bg-muted hover:text-foreground"
        aria-label={`remove ${keyword}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

type ModifierKind = "breakout" | "rollup" | "reject" | "fill";

/** The set of optional modifiers a query can carry, with the copy that
 *  surfaces in the Modify menu. Order here drives the menu order. */
const MODIFIER_ITEMS: {
  kind: ModifierKind;
  label: string;
  description: string;
}[] = [
  {
    kind: "breakout",
    label: "by",
    description: "Split results into one series per signal name.",
  },
  {
    kind: "rollup",
    label: "rollup",
    description: "Override the automatic bucket width.",
  },
  {
    kind: "reject",
    label: "filter",
    description: "Drop raw samples by value or sigma before aggregating.",
  },
  {
    kind: "fill",
    label: "fill",
    description: "Choose what to show when a bucket has no data.",
  },
];

/** "+ Modify" — a popover menu listing every optional modifier not
 *  already on the query, with a one-line description per entry so the
 *  reader can see what it does before clicking. */
function ModifyMenu({
  active,
  onAdd,
}: {
  active: Record<ModifierKind, boolean>;
  onAdd: (kind: ModifierKind) => void;
}) {
  const [open, setOpen] = useState(false);
  const available = MODIFIER_ITEMS.filter((m) => !active[m.kind]);
  if (available.length === 0) return null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Apply a function"
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent/40 hover:text-foreground",
          )}
        >
          <Sigma className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-1">
        <div className="flex flex-col">
          {available.map((m) => (
            <button
              key={m.kind}
              type="button"
              onClick={() => {
                onAdd(m.kind);
                setOpen(false);
              }}
              className="flex flex-col gap-0.5 rounded-sm px-2 py-2 text-left hover:bg-muted/60"
            >
              <span className="text-xs font-medium text-foreground">
                {m.label}
              </span>
              <span className="text-[11px] leading-snug text-muted-foreground">
                {m.description}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Keyword({ children }: { children: ReactNode }) {
  return (
    <span className="select-none text-xs font-medium text-muted-foreground">
      {children}
    </span>
  );
}

/** Inline lowercase connector word between chips ("of", "or"). */
function Connector({ children }: { children: ReactNode }) {
  return (
    <span className="select-none text-xs text-muted-foreground/70">
      {children}
    </span>
  );
}

/** Static "data source" pill on the left edge of a query row. The Mapache
 *  signals page only has one source (signal rows from ClickHouse), so
 *  this is decorative — it gives the row a Datadog-style anchor point. */
function SourcePill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-7 select-none items-center rounded-md bg-primary/15 px-2 text-xs font-medium text-primary">
      {children}
    </span>
  );
}

/** Subtle vertical hairline separating logical sections of the row
 *  (filters vs aggregator vs functions). */
function Divider() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-border" />;
}

/** Muted placeholder shown when a clause has no chips yet. */
function Hint({ children }: { children: ReactNode }) {
  return (
    <span className="select-none text-xs italic text-muted-foreground/60">
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Chip primitives
// ---------------------------------------------------------------------------

const CHIP_BASE =
  "inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-md border bg-background px-2.5 text-xs font-mono transition-colors";

function SelectChip({
  label,
  options,
  onSelect,
  disabled,
}: {
  label: string;
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (disabled) {
    return (
      <span className={cn(CHIP_BASE, "cursor-default opacity-70")}>
        {label}
      </span>
    );
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            CHIP_BASE,
            "font-medium hover:border-primary/40 hover:bg-accent/50",
          )}
        >
          {label}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[180px] p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => {
              onSelect(o.value);
              setOpen(false);
            }}
            className={cn(
              "flex w-full items-center rounded-sm px-2 py-1.5 text-left text-xs font-mono hover:bg-accent",
              label === o.label && "bg-accent",
            )}
          >
            {o.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function AddChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-md border border-dashed bg-transparent px-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent/40 hover:text-foreground",
      )}
    >
      <Plus className="h-3 w-3" />
      {label}
    </button>
  );
}

function RollupChip({
  value,
  onChange,
}: {
  value: Rollup | undefined;
  onChange: (next: Rollup | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = value ?? "auto";
  const isAuto = !value;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            CHIP_BASE,
            "font-medium hover:border-primary/40 hover:bg-accent/50",
            isAuto && "text-muted-foreground",
          )}
        >
          {label}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-[280px] w-[200px] overflow-auto p-1">
        <button
          type="button"
          onClick={() => {
            onChange(undefined);
            setOpen(false);
          }}
          className={cn(
            "flex w-full items-center rounded-sm px-2 py-1.5 text-left text-xs font-mono hover:bg-accent",
            isAuto && "bg-accent",
          )}
        >
          auto
          <span className="ml-auto text-[10px] text-muted-foreground">
            from timeframe
          </span>
        </button>
        <div className="my-1 border-t" />
        {ROLLUP_INTERVALS.map((iv) => (
          <button
            key={iv}
            type="button"
            onClick={() => {
              onChange(iv);
              setOpen(false);
            }}
            className={cn(
              "flex w-full items-center rounded-sm px-2 py-1.5 text-left text-xs font-mono hover:bg-accent",
              value === iv && "bg-accent",
            )}
          >
            {iv}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// Null-gap fill mode. Unset = "gap" (the chart's default), so an untouched
// widget doesn't serialize a `.fill(...)` clause.
function FillChip({
  value,
  onChange,
}: {
  value: FillMode | undefined;
  onChange: (next: FillMode | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const isDefault = !value;
  const label = value ?? "gap";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            CHIP_BASE,
            "font-medium hover:border-primary/40 hover:bg-accent/50",
            isDefault && "text-muted-foreground",
          )}
        >
          {label}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[200px] p-1">
        {FILL_MODES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              // "gap" is the implicit default — clear instead of serializing it.
              onChange(m === "gap" ? undefined : m);
              setOpen(false);
            }}
            className={cn(
              "flex w-full items-center rounded-sm px-2 py-1.5 text-left text-xs font-mono hover:bg-accent",
              label === m && "bg-accent",
            )}
          >
            {m}
            <span className="ml-auto text-[10px] text-muted-foreground">
              {m === "gap"
                ? "break at gaps"
                : m === "last"
                  ? "hold last value"
                  : "bridge linearly"}
            </span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}


// Outlier rejection. Two toggles combine into a RejectNode (OR'd): statistical
// outliers (`sigma > N`) and hard limits (`value outside (min, max)`, or a
// single comparison). UI state is read back from the node, not held in parallel,
// so a hand-typed `.reject(...)` round-trips into the controls.
interface RejectUiState {
  sigmaOn: boolean;
  sigmaN: number;
  min: string;
  max: string;
}

/** Read a RejectNode back into the chip's UI state, recognizing the shapes this
 *  chip writes; anything else falls back to defaults. */
function rejectToUi(node: RejectNode | undefined): RejectUiState {
  const ui: RejectUiState = { sigmaOn: false, sigmaN: 3, min: "", max: "" };
  const visit = (n: RejectNode) => {
    if (n.kind === "bool") {
      visit(n.left);
      visit(n.right);
    } else if (n.kind === "cmp" && n.metric === "sigma") {
      ui.sigmaOn = true;
      ui.sigmaN = n.threshold;
    } else if (n.kind === "cmp" && (n.metric === "signal.value" || n.metric === "signal.raw_value")) {
      if (n.op === "<" || n.op === "<=") ui.min = String(n.threshold);
      else if (n.op === ">" || n.op === ">=") ui.max = String(n.threshold);
    } else if (n.kind === "range" && !n.inside) {
      ui.min = String(n.lo);
      ui.max = String(n.hi);
    }
  };
  if (node) visit(node);
  return ui;
}

/** Build a RejectNode from the chip's UI state (or undefined when nothing is
 *  enabled). Combines an enabled sigma leaf with any hard-limit leaf via OR. */
function uiToReject(ui: RejectUiState): RejectNode | undefined {
  const leaves: RejectNode[] = [];
  if (ui.sigmaOn) {
    leaves.push({ kind: "cmp", metric: "sigma", op: ">", threshold: ui.sigmaN });
  }
  const hasMin = ui.min.trim() !== "" && !Number.isNaN(Number(ui.min));
  const hasMax = ui.max.trim() !== "" && !Number.isNaN(Number(ui.max));
  if (hasMin && hasMax) {
    leaves.push({
      kind: "range",
      metric: "signal.value",
      lo: Number(ui.min),
      hi: Number(ui.max),
      inside: false,
    });
  } else if (hasMin) {
    leaves.push({ kind: "cmp", metric: "signal.value", op: "<", threshold: Number(ui.min) });
  } else if (hasMax) {
    leaves.push({ kind: "cmp", metric: "signal.value", op: ">", threshold: Number(ui.max) });
  }
  if (leaves.length === 0) return undefined;
  return leaves.reduce((left, right) => ({ kind: "bool", op: "or", left, right }));
}

/** One-line summary of the active reject for the chip face (e.g.
 *  "σ>3 · outside 0–100"). */
function rejectSummary(ui: RejectUiState): string | null {
  const parts: string[] = [];
  if (ui.sigmaOn) parts.push(`σ>${ui.sigmaN}`);
  const hasMin = ui.min.trim() !== "";
  const hasMax = ui.max.trim() !== "";
  if (hasMin && hasMax) parts.push(`outside ${ui.min}–${ui.max}`);
  else if (hasMin) parts.push(`<${ui.min}`);
  else if (hasMax) parts.push(`>${ui.max}`);
  return parts.length ? parts.join(" · ") : null;
}

/** Compact, null-safe number for the cut summary (≤2 decimals, no trailing
 *  zeros). */
function formatCutNumber(n: number | null): string {
  if (n === null || Number.isNaN(n)) return "–";
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}

/** Series label for a cut-summary entry — the `name` tag, else the first tag
 *  value, else "all" (an empty-tags entry means the query has no group-by). */
function cutEntryLabel(tags: Record<string, string | null>): string {
  if (tags.name) return tags.name;
  for (const v of Object.values(tags)) if (v) return v;
  return "all";
}

function RejectChip({
  value,
  onChange,
  stats,
}: {
  value: RejectNode | undefined;
  onChange: (next: RejectNode | undefined) => void;
  stats: RejectStatsEntry[] | null;
}) {
  const [open, setOpen] = useState(false);
  // Raw string lets the sigma field be emptied mid-edit without snapping to 0;
  // null means "show the value read back from the node".
  const [sigmaDraft, setSigmaDraft] = useState<string | null>(null);
  const ui = rejectToUi(value);
  const summary = rejectSummary(ui);

  // Patch straight through to a RejectNode — the chip is a pure view of `value`.
  const apply = (patch: Partial<RejectUiState>) =>
    onChange(uiToReject({ ...ui, ...patch }));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            CHIP_BASE,
            "font-medium hover:border-primary/40 hover:bg-accent/50",
            !summary && "text-muted-foreground",
          )}
        >
          {summary ?? "none"}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[260px] p-3">
        <div className="flex flex-col gap-3">
          {/* Statistical outliers → sigma > N */}
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={ui.sigmaOn}
              onChange={(e) => apply({ sigmaOn: e.target.checked })}
              className="h-3.5 w-3.5 rounded border-input accent-primary"
            />
            <span>remove statistical outliers</span>
          </label>
          {ui.sigmaOn ? (
            <div className="flex items-center gap-2 pl-6 text-xs">
              <span className="text-muted-foreground">beyond</span>
              <Input
                type="number"
                value={sigmaDraft ?? ui.sigmaN}
                onChange={(e) => {
                  const v = e.target.value;
                  setSigmaDraft(v);
                  if (v.trim() !== "") apply({ sigmaN: Number(v) });
                }}
                onBlur={() => {
                  if (sigmaDraft !== null && sigmaDraft.trim() === "") {
                    apply({ sigmaN: 3 });
                  }
                  setSigmaDraft(null);
                }}
                className="h-7 w-16 font-mono text-xs"
              />
              <span className="text-muted-foreground">σ</span>
            </div>
          ) : null}

          <div className="border-t" />

          {/* Hard limits → value range / single comparison */}
          <span className="text-xs text-muted-foreground">hard limits</span>
          <div className="flex items-center gap-2 text-xs">
            <Input
              type="number"
              placeholder="min"
              value={ui.min}
              onChange={(e) => apply({ min: e.target.value })}
              className="h-7 flex-1 font-mono text-xs"
            />
            <span className="text-muted-foreground">to</span>
            <Input
              type="number"
              placeholder="max"
              value={ui.max}
              onChange={(e) => apply({ max: e.target.value })}
              className="h-7 flex-1 font-mono text-xs"
            />
          </div>

          {/* Read-only cut summary from the most recent run. */}
          {stats && stats.length > 0 ? (
            <>
              <div className="border-t" />
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">samples cut</span>
                {stats.map((s, i) => (
                  <div key={i} className="text-xs text-muted-foreground">
                    <span className="font-mono text-foreground/80">
                      {cutEntryLabel(s.tags)}
                    </span>
                    {" — cut "}
                    {formatCutNumber(s.cut_count)}
                    {" · range "}
                    {formatCutNumber(s.min)}–{formatCutNumber(s.max)}
                    {" (avg "}
                    {formatCutNumber(s.avg)}
                    {")"}
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FilterChip({
  value,
  onChange,
  onRemove,
  signalNames,
}: {
  value: Predicate;
  onChange: (next: Predicate) => void;
  onRemove: () => void;
  signalNames: string[];
}) {
  // Auto-open when freshly added (empty) so the user can start typing.
  const [open, setOpen] = useState(value.value === "");
  const filled = Boolean(value.value);

  return (
    <span
      className={cn(
        CHIP_BASE,
        "gap-1.5 pr-1",
        !filled && "border-destructive/40",
      )}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-sm hover:text-primary"
          >
            {value.op === "!=" ? (
              <span className="text-muted-foreground">not</span>
            ) : null}
            {filled ? (
              <span className="font-medium">{value.value}</span>
            ) : (
              <span className="italic text-muted-foreground">choose…</span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[300px] p-2">
          <FilterEditor
            value={value}
            onChange={onChange}
            signalNames={signalNames}
            onCommit={() => setOpen(false)}
          />
        </PopoverContent>
      </Popover>
      <button
        type="button"
        aria-label="Remove filter"
        onClick={onRemove}
        className="rounded-sm p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        title="Remove filter"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function FilterEditor({
  value,
  onChange,
  signalNames,
  onCommit,
}: {
  value: Predicate;
  onChange: (next: Predicate) => void;
  signalNames: string[];
  onCommit: () => void;
}) {
  const [search, setSearch] = useState(value.value);

  const fuse = useMemo(
    () =>
      new Fuse(signalNames, {
        threshold: 0.3,
        ignoreLocation: true,
      }),
    [signalNames],
  );

  const hasWildcard = search.includes("*");

  const matches = useMemo(() => {
    const q = search.trim();
    if (!q) return signalNames.slice(0, 50);
    if (hasWildcard) {
      // Compile to an anchored regex mirroring the backend's LIKE semantics.
      const escaped = q
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*");
      try {
        const rx = new RegExp(`^${escaped}$`, "i");
        return signalNames.filter((n) => rx.test(n)).slice(0, 50);
      } catch {
        return [];
      }
    }
    return fuse.search(q).slice(0, 50).map((r) => r.item);
  }, [search, signalNames, fuse, hasWildcard]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <SelectChip
          label={value.column}
          options={FILTERABLE_COLUMNS.map((c) => ({ value: c, label: c }))}
          onSelect={(c) => onChange({ ...value, column: c as FilterColumn })}
        />
        <SelectChip
          label={value.op === "!=" ? "is not" : "is"}
          options={[
            { value: "=", label: "is" },
            { value: "!=", label: "is not" },
          ]}
          onSelect={(op) => onChange({ ...value, op: op as "=" | "!=" })}
        />
        <Input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              // Wildcards commit the literal pattern (LIKE semantics); otherwise
              // take the top fuzzy match.
              const pick = hasWildcard
                ? search.trim()
                : (matches[0] ?? search.trim());
              if (!pick) return;
              onChange({ ...value, value: pick });
              onCommit();
            } else if (e.key === "Escape") {
              onCommit();
            }
          }}
          placeholder="signal name (use * for wildcards)"
          className="h-8 font-mono text-xs"
        />
        {hasWildcard ? (
          <span className="whitespace-nowrap text-[10px] text-muted-foreground">
            {matches.length} match
            {matches.length === 1 ? "" : "es"}
          </span>
        ) : null}
      </div>
      <div className="max-h-[220px] overflow-auto rounded-sm border bg-popover">
        {matches.length === 0 ? (
          <div className="p-2 text-xs text-muted-foreground">No matches</div>
        ) : (
          matches.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                onChange({ ...value, value: name });
                onCommit();
              }}
              className={cn(
                "flex w-full items-center px-2 py-1 text-left font-mono text-xs hover:bg-accent",
                value.value === name && "bg-accent",
              )}
            >
              {name}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

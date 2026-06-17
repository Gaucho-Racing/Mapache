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
import Fuse from "fuse.js";
import { ChevronDown, Plus, X } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

interface QueryBuilderProps {
  value: Query;
  onChange: (next: Query) => void;
  /** Available signal names for the filter-value autocomplete. Pulled from
   *  the page's existing `/query/signals` fetch so the picker and the
   *  table never disagree about what exists. */
  signalNames: string[];
  /** Parser/execution error from the most recent run. Surfaced under the
   *  serialized preview; the builder itself stays interactive so the user
   *  can keep iterating. */
  error?: { message: string; position?: number } | null;
  /** Opt-in editable MQL line. When provided, the serialized-MQL preview
   *  becomes a controlled `<input>`: typing calls `onMqlChange(text)` and the
   *  parent re-parses (and may surface an error via `error`). When absent the
   *  preview stays a read-only `<code>` exactly as before. */
  onMqlChange?: (mql: string) => void;
  /** Focus lifecycle of the editable MQL line. The parent uses these to FREEZE
   *  this row as a fetch row while the user is typing in the line, so deleting
   *  the `(` (which momentarily makes the text stop looking like a fetch query)
   *  doesn't unmount the builder and steal the caret mid-edit. */
  onMqlFocus?: () => void;
  onMqlBlur?: () => void;
}

export function QueryBuilder({
  value,
  onChange,
  signalNames,
  error,
  onMqlChange,
  onMqlFocus,
  onMqlBlur,
}: QueryBuilderProps) {
  const fieldOptions: FieldName[] = ROW_COUNT_AGGS.has(value.fn)
    ? [COUNT_FIELD]
    : NUMERIC_FIELDS;
  const fieldFixed = fieldOptions.length === 1;

  function setFn(fn: Aggregator) {
    // Swapping aggregator classes (count ↔ avg/sum/...) invalidates the
    // current field. Reset to the canonical default to keep the AST
    // valid without a separate "field is wrong" error state.
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

  // `.by(name)` is the only grouping today: with it on, the query returns one
  // series PER matching signal (a breakdown); off, one combined series. We
  // surface this single choice as a toggle rather than a column picker. `->`
  // can't combine with `.by` (a breakdown is already labeled by its group
  // values), so turning break-out on clears any label.
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
    // Pass an explicit undefined to clear instead of leaving rollup
    // hanging around as an empty string in the AST.
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
    // The label is a `-> name` variable: keep it to identifier characters so
    // it parses and can be referenced from expression lines.
    const ident = next?.replace(/[^A-Za-z0-9_]/g, "");
    const { label: _drop, ...rest } = value;
    onChange(ident ? { ...rest, label: ident } : rest);
  }

  // Editable MQL line (two-way chips↔text). Local text state is the user's
  // source of truth while they type; we only re-seed it from the serialized AST
  // when a CHIP changed the query — never on the user's own keystrokes. Without
  // this gate the canonical re-serialization (normalized spacing, or a fallback
  // to the last-good query when the text transiently fails to parse) would yank
  // the caret to the end and even re-populate a box the user just cleared,
  // making free rewriting impossible. Mirrors MqlEditor's `lastEmitted` guard.
  const serialized = serializeQuery(value);
  const [mqlText, setMqlText] = useState(serialized);
  const lastSerialized = useRef(serialized);
  // Set on every text keystroke; consumed by the re-sync effect to distinguish
  // our own edit echo (skip the overwrite) from a chip-driven change (apply it).
  const fromTextEdit = useRef(false);
  useEffect(() => {
    if (fromTextEdit.current) {
      // Our own typing flowed out and came back as a (possibly normalized)
      // serialized form — don't overwrite what the user is editing.
      fromTextEdit.current = false;
      lastSerialized.current = serialized;
      return;
    }
    if (serialized !== lastSerialized.current) {
      setMqlText(serialized);
      lastSerialized.current = serialized;
    }
  }, [serialized]);

  return (
    <div className="flex flex-col gap-2.5">
      {/* The builder reads as a left-to-right sentence:
       *   Show <agg> of <field>   where <filters>   grouped by <groups>   every <rollup>
       * Each clause is its own visual segment with a soft keyword lead-in
       * so the structure is legible without reading the chips as a run-on. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 leading-7">
        <Clause keyword="Show">
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
        </Clause>

        <Clause keyword="where">
          {value.filters.length === 0 ? (
            <Hint>all signals</Hint>
          ) : (
            value.filters.map((pred, i) => {
              // Adjacent filters on the same column combine: equality matches
              // union ("or"), negations intersect ("and" — exclude all). Show
              // the matching connector so the sequence doesn't read ambiguously.
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
          <AddChip label="filter" onClick={addFilter} />
        </Clause>

        <BreakoutToggle value={breakout} onChange={setBreakout} />

        <Clause keyword="every">
          <RollupChip value={value.rollup} onChange={setRollup} />
        </Clause>

        <Clause keyword="reject">
          <RejectChip value={value.reject} onChange={setReject} />
        </Clause>

        <Clause keyword="fill">
          <FillChip value={value.fill} onChange={setFill} />
        </Clause>

        {/* `-> name` names the single result series (one slice/legend entry)
            and exposes it as a variable. Hidden while breaking out — a
            breakdown is already labeled by its per-signal group values. */}
        {!breakout ? (
          <Clause keyword="→">
            <LabelChip value={value.label} onChange={setLabel} />
          </Clause>
        ) : null}
      </div>

      <div className="flex flex-col gap-1 rounded-md border bg-muted/30 px-2.5 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          MQL
        </span>
        {onMqlChange ? (
          // Editable: typing flows out to the parent, which re-parses. The
          // chips re-sync this line whenever they change the serialized form.
          <input
            value={mqlText}
            onChange={(e) => {
              fromTextEdit.current = true;
              setMqlText(e.target.value);
              onMqlChange(e.target.value);
            }}
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

/** A clause is a keyword lead-in ("where", "grouped by", ...) followed by its
 *  chips, kept together so they wrap as a unit and read as one phrase. */
function Clause({
  keyword,
  children,
}: {
  keyword: string;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Keyword>{keyword}</Keyword>
      {children}
    </span>
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

/** Muted placeholder shown when a clause has no chips yet, so the sentence
 *  still reads ("where all signals", "grouped by nothing"). */
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
  "inline-flex h-7 items-center gap-1 rounded-md border bg-background px-2.5 text-xs font-mono transition-colors";

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

// ---------------------------------------------------------------------------
// Fill chip (W4) — pick the null-gap fill mode. Unset = "gap" (the default the
// chart already applies), so an untouched widget reads "fill gap" without
// serializing a `.fill(...)` clause.
// ---------------------------------------------------------------------------

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
              // "gap" is the implicit default — clear the clause instead of
              // serializing a redundant `.fill(gap)`.
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

// ---------------------------------------------------------------------------
// Break-out toggle — the single grouping choice (`.by(name)`). On = one series
// per matching signal (a breakdown); off = one combined series. Replaces the
// old column picker, which only ever offered "name".
// ---------------------------------------------------------------------------

function BreakoutToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer select-none items-center gap-2 text-xs text-muted-foreground">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-input accent-primary"
      />
      by name
    </label>
  );
}

// ---------------------------------------------------------------------------
// Label chip (`-> name`) — name the result series and expose it as a variable.
// Unset reads "name" (the series falls back to its tag-derived name, e.g.
// "value" for an ungrouped query). A name is what lets a stack of queries
// render as distinct pie slices / legend entries and be referenced from
// expression lines. Input is restricted to identifier characters by `setLabel`.
// ---------------------------------------------------------------------------

function LabelChip({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (next: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  // Re-seed the draft from the AST whenever it changes (e.g. the MQL line edits
  // `-> name` directly) so the popover input mirrors the current value.
  useEffect(() => setDraft(value ?? ""), [value]);
  const isDefault = !value;
  const commit = () => {
    onChange(draft);
    setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={(o) => { if (!o) commit(); setOpen(o); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            CHIP_BASE,
            "font-medium hover:border-primary/40 hover:bg-accent/50",
            isDefault && "text-muted-foreground",
          )}
        >
          {value ?? "name"}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[220px] p-2">
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") {
              setDraft(value ?? "");
              setOpen(false);
            }
          }}
          placeholder="variable name (e.g. ecu)"
          className="h-8 font-mono text-xs"
        />
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Reject chip (W1) — outlier rejection. Two independent toggles combine into a
// RejectNode:
//   - statistical outliers → `sigma > N`
//   - hard limits → `value outside (min, max)` (or a single comparison when
//     only one bound is set).
// When both are on they OR together (reject if statistical OR out of bounds).
// Nothing enabled → reject undefined (no `.reject(...)` clause).
//
// We derive the editor's UI state by *reading* the current RejectNode rather
// than holding a parallel copy, so a `.reject(...)` typed into the MQL line
// round-trips into the popover's controls.
// ---------------------------------------------------------------------------

interface RejectUiState {
  sigmaOn: boolean;
  sigmaN: number;
  min: string;
  max: string;
}

/** Read a RejectNode back into the chip's UI state. Recognizes exactly the
 *  shapes this chip writes (a `sigma > N` leaf and/or a value range/single
 *  comparison, possibly OR'd); anything else falls back to defaults so the
 *  controls stay usable even over a hand-authored tree. */
function rejectToUi(node: RejectNode | undefined): RejectUiState {
  const ui: RejectUiState = { sigmaOn: false, sigmaN: 3, min: "", max: "" };
  const visit = (n: RejectNode) => {
    if (n.kind === "bool") {
      visit(n.left);
      visit(n.right);
    } else if (n.kind === "cmp" && n.metric === "sigma") {
      ui.sigmaOn = true;
      ui.sigmaN = n.threshold;
    } else if (n.kind === "cmp" && (n.metric === "value" || n.metric === "raw_value")) {
      // single-bound hard limit: `value < min` or `value > max`
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
      metric: "value",
      lo: Number(ui.min),
      hi: Number(ui.max),
      inside: false,
    });
  } else if (hasMin) {
    // Only a floor set → reject anything below it.
    leaves.push({ kind: "cmp", metric: "value", op: "<", threshold: Number(ui.min) });
  } else if (hasMax) {
    leaves.push({ kind: "cmp", metric: "value", op: ">", threshold: Number(ui.max) });
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

function RejectChip({
  value,
  onChange,
}: {
  value: RejectNode | undefined;
  onChange: (next: RejectNode | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const ui = rejectToUi(value);
  const summary = rejectSummary(ui);

  // Apply a patched UI state straight through to a RejectNode so the chip is a
  // pure view of `value` — no local copy to drift.
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
                value={ui.sigmaN}
                onChange={(e) =>
                  apply({ sigmaN: Number(e.target.value) || 0 })
                }
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
  // Open the popover automatically when the chip is freshly added (empty
  // value) so the user doesn't have to click again to start typing.
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
            <span className="font-medium">{value.column}</span>
            <span className="text-muted-foreground">
              {value.op === "!=" ? "is not" : "is"}
            </span>
            {filled ? (
              <span>{value.value}</span>
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
      // Compile the wildcard pattern to a regex so the preview list
      // shows what would actually match on the backend (`*` ⇒ any run
      // of characters). Anchor with ^…$ to mirror LIKE's full-string
      // semantics — `bcu_*_temp` shouldn't match `prefix_bcu_x_temp`.
      const escaped = q
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&") // escape regex metachars
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
              // Wildcards commit the literal pattern (we want LIKE
              // semantics, not "pick the first match"). Otherwise prefer
              // the top fuzzy match — saves a click when the user typed
              // an exact-ish prefix.
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

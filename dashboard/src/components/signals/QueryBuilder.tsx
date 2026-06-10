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
  type FilterColumn,
  FILTERABLE_COLUMNS,
  type GroupColumn,
  GROUPABLE_COLUMNS,
  NUMERIC_FIELDS,
  type Predicate,
  type Query,
  type Rollup,
  ROLLUP_INTERVALS,
  ROW_COUNT_AGGS,
  serializeQuery,
} from "@/lib/query";
import { cn } from "@/lib/utils";
import Fuse from "fuse.js";
import { ChevronDown, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";

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
}

export function QueryBuilder({
  value,
  onChange,
  signalNames,
  error,
}: QueryBuilderProps) {
  const fieldOptions: FieldName[] = ROW_COUNT_AGGS.has(value.fn)
    ? [COUNT_FIELD]
    : NUMERIC_FIELDS;

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
      filters: [
        ...value.filters,
        { column: "name", op: "=", value: "" },
      ],
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

  function addGroup() {
    // Only one groupable column today; if it's already in the list bail
    // out instead of creating a duplicate the SQL would reject anyway.
    const next = GROUPABLE_COLUMNS.find((c) => !value.groupBy.includes(c));
    if (!next) return;
    onChange({ ...value, groupBy: [...value.groupBy, next] });
  }

  function removeGroup(col: GroupColumn) {
    onChange({
      ...value,
      groupBy: value.groupBy.filter((c) => c !== col),
    });
  }

  function setRollup(next: Rollup | undefined) {
    // Pass an explicit undefined to clear instead of leaving rollup
    // hanging around as an empty string in the AST.
    const { rollup: _drop, ...rest } = value;
    onChange(next ? { ...rest, rollup: next } : rest);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <SelectChip
          label={value.fn}
          options={AGGREGATORS.map((a) => ({
            value: a.value,
            label: a.label,
          }))}
          onSelect={(v) => setFn(v as Aggregator)}
        />
        <SelectChip
          label={value.field}
          options={fieldOptions.map((f) => ({ value: f, label: f }))}
          onSelect={(v) => setField(v as FieldName)}
          disabled={fieldOptions.length === 1}
        />

        <span className="px-1 text-xs uppercase tracking-wide text-muted-foreground">
          from
        </span>
        {value.filters.map((pred, i) => {
          // Adjacent filters on the same column union (OR semantics);
          // show a tiny "or" between them so the user sees this rather
          // than reading the visual sequence as AND.
          const prev = i > 0 ? value.filters[i - 1] : null;
          const sameColAsPrev = prev !== null && prev.column === pred.column;
          return (
            <span key={i} className="inline-flex items-center gap-1.5">
              {sameColAsPrev ? (
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  or
                </span>
              ) : null}
              <FilterChip
                value={pred}
                onChange={(next) => updateFilter(i, next)}
                onRemove={() => removeFilter(i)}
                signalNames={signalNames}
              />
            </span>
          );
        })}
        <AddChip label="Filter" onClick={addFilter} />

        <span className="px-1 text-xs uppercase tracking-wide text-muted-foreground">
          by
        </span>
        {value.groupBy.map((col) => (
          <GroupChip key={col} column={col} onRemove={() => removeGroup(col)} />
        ))}
        {value.groupBy.length < GROUPABLE_COLUMNS.length ? (
          <AddChip label="Group" onClick={addGroup} />
        ) : null}

        <span className="px-1 text-xs uppercase tracking-wide text-muted-foreground">
          rollup
        </span>
        <RollupChip value={value.rollup} onChange={setRollup} />
      </div>

      <code
        className={cn(
          "block font-mono text-xs text-muted-foreground",
          error && "text-destructive",
        )}
      >
        {serializeQuery(value)}
      </code>
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
// Chip primitives
// ---------------------------------------------------------------------------

const CHIP_BASE =
  "inline-flex h-7 items-center gap-1 rounded-md border bg-background px-2 text-xs font-mono transition-colors";

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
          className={cn(CHIP_BASE, "hover:bg-accent/50")}
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
        CHIP_BASE,
        "border-dashed text-muted-foreground hover:bg-accent/40 hover:text-foreground",
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
            "hover:bg-accent/50",
            isAuto && "text-muted-foreground",
          )}
        >
          {label}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[180px] p-1">
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

function GroupChip({
  column,
  onRemove,
}: {
  column: GroupColumn;
  onRemove: () => void;
}) {
  return (
    <span className={cn(CHIP_BASE, "pr-1")}>
      {column}
      <button
        type="button"
        onClick={onRemove}
        className="rounded-sm p-0.5 hover:bg-accent"
        title="Remove group"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
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

  const display = value.value
    ? `${value.column} = "${value.value}"`
    : `${value.column} = …`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            CHIP_BASE,
            "pr-1 hover:bg-accent/50",
            !value.value && "border-destructive/40 text-muted-foreground",
          )}
        >
          {display}
          <span
            role="button"
            aria-label="Remove filter"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="ml-1 rounded-sm p-0.5 hover:bg-accent"
          >
            <X className="h-3 w-3" />
          </span>
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
          onSelect={(c) =>
            onChange({ ...value, column: c as FilterColumn })
          }
        />
        <span className="text-xs text-muted-foreground">=</span>
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
          <div className="p-2 text-xs text-muted-foreground">
            No matches
          </div>
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

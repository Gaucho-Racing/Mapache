import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/** The page-level time window. Always absolute under the hood — presets
 *  just snap start/end to a "now-anchored" pair at the moment they're
 *  picked. `label` is metadata for the chip display ("Past 1 week",
 *  "Past 45 minutes", or "Custom" when the user dragged on the chart). */
export interface Timeframe {
  start: Date;
  end: Date;
  label: string;
}

export interface TimeframePreset {
  label: string;
  shortcut: string;
  rangeSeconds: number;
}

export const TIMEFRAME_PRESETS: TimeframePreset[] = [
  { label: "Past 1 minute",   shortcut: "1m",  rangeSeconds: 60 },
  { label: "Past 15 minutes", shortcut: "15m", rangeSeconds: 15 * 60 },
  { label: "Past 30 minutes", shortcut: "30m", rangeSeconds: 30 * 60 },
  { label: "Past 1 hour",     shortcut: "1h",  rangeSeconds: 60 * 60 },
  { label: "Past 4 hours",    shortcut: "4h",  rangeSeconds: 4 * 60 * 60 },
  { label: "Past 1 day",      shortcut: "1d",  rangeSeconds: 24 * 60 * 60 },
  { label: "Past 2 days",     shortcut: "2d",  rangeSeconds: 2 * 24 * 60 * 60 },
  { label: "Past 1 week",     shortcut: "1w",  rangeSeconds: 7 * 24 * 60 * 60 },
];

// Aliases mapped to seconds-per-unit. Plural / abbreviated variants all
// collapse to the same multiplier so users can type whatever feels natural.
const UNIT_SECONDS: Record<string, number> = {
  s: 1, sec: 1, secs: 1, second: 1, seconds: 1,
  m: 60, min: 60, mins: 60, minute: 60, minutes: 60,
  h: 3600, hr: 3600, hrs: 3600, hour: 3600, hours: 3600,
  d: 86400, day: 86400, days: 86400,
  w: 604800, wk: 604800, week: 604800, weeks: 604800,
};

const SHORTCUT_RX = /^(\d+)\s*([a-z]+)$/;

// Absolute-range parser. Canonical separator is " - " (space-dash-space)
// since it's easy to type and not conflicting with the date format's
// internal dashes. We also accept `→`, `->`, and ` to ` as input tolerance
// — output always uses " - ". Times are interpreted in the user's local
// timezone — that's what `new Date(y, m, d, h, min)` does by default and
// matches the chip's display.
const RANGE_SEPARATOR_RX = /\s+(?:-|→|->|to)\s+/i;
const ABS_DT_RX = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;

function parseAbsoluteDatetime(s: string): Date | null {
  const m = s.trim().match(ABS_DT_RX);
  if (!m) return null;
  const [, y, mo, d, h, mi, se] = m;
  const dt = new Date(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h ?? "0"),
    Number(mi ?? "0"),
    Number(se ?? "0"),
  );
  return isNaN(dt.getTime()) ? null : dt;
}

function parseAbsoluteRange(input: string): Timeframe | null {
  // Split on the first separator match; if there's no separator we're
  // not looking at an absolute range and fall through to shortcuts.
  const parts = input.split(RANGE_SEPARATOR_RX);
  if (parts.length !== 2) return null;
  const start = parseAbsoluteDatetime(parts[0]);
  const end = parseAbsoluteDatetime(parts[1]);
  if (!start || !end || start >= end) return null;
  return { start, end, label: "Custom" };
}

/** Build a now-anchored relative timeframe with the given preset label. */
export function relativeTimeframe(
  rangeSeconds: number,
  label: string,
): Timeframe {
  const end = new Date();
  const start = new Date(end.getTime() - rangeSeconds * 1000);
  return { start, end, label };
}

export function defaultTimeframe(): Timeframe {
  return relativeTimeframe(7 * 24 * 60 * 60, "Past 1 week");
}

/** Parse user input into a Timeframe. Accepts three forms, tried in
 *  order: absolute range (`YYYY-MM-DD HH:MM - YYYY-MM-DD HH:MM`), preset
 *  label or shortcut (`Past 1 week`, `1w`), and ad-hoc shortcut (`45m`).
 *  Returns null if none match. */
export function parseTimeframeInput(input: string): Timeframe | null {
  const raw = input.trim();
  if (!raw) return null;

  // Absolute range first — it's the only form that can contain
  // whitespace internally, so the cheap match is unambiguous.
  const abs = parseAbsoluteRange(raw);
  if (abs) return abs;

  const s = raw.toLowerCase();
  for (const p of TIMEFRAME_PRESETS) {
    if (s === p.label.toLowerCase() || s === p.shortcut) {
      return relativeTimeframe(p.rangeSeconds, p.label);
    }
  }
  const m = s.match(SHORTCUT_RX);
  if (m) {
    const n = parseInt(m[1], 10);
    const mult = UNIT_SECONDS[m[2]];
    if (n > 0 && mult) {
      const seconds = n * mult;
      const label = `Past ${formatDuration(seconds)}`;
      return relativeTimeframe(seconds, label);
    }
  }
  return null;
}

function formatDuration(s: number): string {
  if (s % 604800 === 0) return plural(s / 604800, "week");
  if (s % 86400 === 0)  return plural(s / 86400,  "day");
  if (s % 3600 === 0)   return plural(s / 3600,   "hour");
  if (s % 60 === 0)     return plural(s / 60,     "minute");
  return plural(s, "second");
}

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

/** Compact local-time formatting for the chip's range display. Shows the
 *  date prefix only when the range crosses a day boundary, so a 1-hour
 *  range reads "1:00 PM - 2:00 PM" without redundant "Jun 10" on both
 *  sides. */
function formatRange(start: Date, end: Date): string {
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();
  const time: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
  };
  const dateTime: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  };
  if (sameDay) {
    const date = start.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    return `${date}, ${start.toLocaleTimeString(undefined, time)} - ${end.toLocaleTimeString(undefined, time)}`;
  }
  return `${start.toLocaleString(undefined, dateTime)} - ${end.toLocaleString(undefined, dateTime)}`;
}

/** Editable form: `YYYY-MM-DD HH:MM - YYYY-MM-DD HH:MM`, local time. Round
 *  trips through `parseAbsoluteRange` so what the user sees in the input
 *  is exactly what they'd type to reproduce it. */
function formatRangeForInput(start: Date, end: Date): string {
  return `${formatLocalDT(start)} - ${formatLocalDT(end)}`;
}

function formatLocalDT(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${h}:${min}`;
}

interface TimeframePickerProps {
  value: Timeframe;
  onChange: (next: Timeframe) => void;
  className?: string;
}

export function TimeframePicker({
  value,
  onChange,
  className,
}: TimeframePickerProps) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) return;
    // Always seed with the absolute range so the user can tweak either
    // side directly. Typing a shortcut like `1h` still works — the
    // parser tries the absolute form first, then falls back to presets
    // and shortcuts.
    setInput(formatRangeForInput(value.start, value.end));
    setError(false);
    const t = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => clearTimeout(t);
  }, [editing, value]);

  useEffect(() => {
    if (!editing) return;
    function onMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setEditing(false);
        setError(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [editing]);

  function commit(tf: Timeframe) {
    onChange(tf);
    setEditing(false);
    setError(false);
  }

  function tryCommit() {
    const parsed = parseTimeframeInput(input);
    if (parsed === null) {
      setError(true);
      return;
    }
    commit(parsed);
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={cn(
          "flex h-12 w-[340px] items-center justify-between rounded-md border border-input bg-background px-3 text-left",
          "hover:bg-accent hover:text-accent-foreground",
          className,
        )}
      >
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm">
            {formatRange(value.start, value.end)}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {value.label}
          </span>
        </div>
        <Clock className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div ref={containerRef} className={cn("relative w-[340px]", className)}>
      <Input
        ref={inputRef}
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setError(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            tryCommit();
          } else if (e.key === "Escape") {
            setEditing(false);
            setError(false);
          }
        }}
        placeholder="1h, 2d, or 2026-06-03 14:00 - 2026-06-08 09:00"
        className={cn(
          "h-12 font-mono text-xs",
          error && "border-destructive focus-visible:ring-destructive",
        )}
      />
      <div className="absolute left-0 right-0 top-13 z-20 mt-1 max-h-[300px] overflow-auto rounded-md border bg-popover py-1 shadow-md">
        {TIMEFRAME_PRESETS.map((p) => (
          <button
            key={p.shortcut}
            type="button"
            // Mousedown (not click) so we beat the document-level
            // mousedown handler above that would otherwise cancel the
            // edit before the click event fires.
            onMouseDown={(e) => {
              e.preventDefault();
              commit(relativeTimeframe(p.rangeSeconds, p.label));
            }}
            className={cn(
              "flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-accent",
              p.label === value.label && "bg-accent",
            )}
          >
            <span>{p.label}</span>
            <span className="text-xs text-muted-foreground">{p.shortcut}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { fetchSessions } from "@/lib/sessions/api";
import type { Session } from "@/models/session";
import { format } from "date-fns";
import Fuse from "fuse.js";
import { CalendarDays, Clock } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DateRange } from "react-day-picker";

/** The page-level time window — always absolute; presets snap to a now-anchored
 *  pair when picked. `label` is chip-display metadata ("Past 1 week", "Custom"). */
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

// Unit aliases → seconds, so users can type whatever feels natural.
const UNIT_SECONDS: Record<string, number> = {
  s: 1, sec: 1, secs: 1, second: 1, seconds: 1,
  m: 60, min: 60, mins: 60, minute: 60, minutes: 60,
  h: 3600, hr: 3600, hrs: 3600, hour: 3600, hours: 3600,
  d: 86400, day: 86400, days: 86400,
  w: 604800, wk: 604800, week: 604800, weeks: 604800,
};

const SHORTCUT_RX = /^(\d+)\s*([a-z]+)$/;

// Canonical separator is " - "; `→`, `->`, ` to ` are accepted on input. Times
// are local (matching the chip display).
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

/** Parse user input into a Timeframe, trying in order: absolute range, preset
 *  label/shortcut (`Past 1 week`, `1w`), ad-hoc shortcut (`45m`). Null if none. */
export function parseTimeframeInput(input: string): Timeframe | null {
  const raw = input.trim();
  if (!raw) return null;

  // Absolute range first — the only form with internal whitespace.
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

/** Chip range display; shows the date prefix only when the range crosses a day. */
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

/** Editable absolute-range form (local time); round-trips through the parser. */
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

/** Calendar-driven range builder; hands back the canonical absolute-range
 *  string the text parser already understands (no new parse path). */
function CalendarRangePicker({
  value,
  onApply,
}: {
  value: Timeframe;
  onApply: (rangeString: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>({
    from: value.start,
    to: value.end,
  });
  const [startTime, setStartTime] = useState(format(value.start, "HH:mm"));
  const [endTime, setEndTime] = useState(format(value.end, "HH:mm"));

  // Re-seed from the active timeframe each time the popover opens.
  useEffect(() => {
    if (!open) return;
    setRange({ from: value.start, to: value.end });
    setStartTime(format(value.start, "HH:mm"));
    setEndTime(format(value.end, "HH:mm"));
  }, [open, value]);

  function apply() {
    const from = range?.from;
    // Single-day selection leaves `to` undefined — use the lone day for both.
    const to = range?.to ?? range?.from;
    if (!from || !to) return;
    const startStr = `${format(from, "yyyy-MM-dd")} ${startTime || "00:00"}`;
    const endStr = `${format(to, "yyyy-MM-dd")} ${endTime || "23:59"}`;
    onApply(`${startStr} - ${endStr}`);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {/* The final preset row — opens the calendar instead of committing. */}
        <button
          type="button"
          aria-label="Select a range from the calendar"
          onMouseDown={(e) => e.preventDefault()}
          className={cn(
            "flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-accent",
            value.label === "Custom" && "bg-accent",
          )}
        >
          <span>Select from calendar</span>
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto p-0"
        // Don't let clicks bubble to the picker's document-level mousedown
        // handler, which would close the editor.
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Calendar
          mode="range"
          numberOfMonths={1}
          selected={range}
          onSelect={setRange}
          defaultMonth={value.start}
          className="p-3 pb-0"
        />
        <div className="flex flex-col gap-3 border-t p-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              Start time
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-8"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              End time
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="h-8"
              />
            </label>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={apply} disabled={!range?.from}>
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Compact human label for a session row's secondary line: start date + run
 *  duration. */
function formatSessionMeta(session: Session): string {
  const start = new Date(session.start_time);
  const ms = new Date(session.end_time).getTime() - start.getTime();
  const date = format(start, "MMM d, h:mm a");
  const seconds = Math.max(0, Math.round(ms / 1000));
  return `${date} · ${formatDuration(seconds)}`;
}

/** Sessions section of the editing dropdown: lazily-loaded, Fuse-filtered list.
 *  Picking a session commits its window as a Timeframe and notifies the page. */
function SessionPicker({
  vehicleId,
  selectedSessionId,
  onPick,
}: {
  vehicleId: string;
  selectedSessionId?: string;
  onPick: (session: Session) => void;
}) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  // Cache by vehicleId so re-opening the dropdown doesn't refetch.
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!vehicleId || loadedFor.current === vehicleId) return;
    let cancelled = false;
    setLoading(true);
    fetchSessions(vehicleId, { limit: 200 })
      .then((rows) => {
        if (cancelled) return;
        setSessions(rows);
        // Mark loaded only on success, so StrictMode's mount→cleanup→remount
        // (which cancels the first fetch) still refetches on the second mount
        // instead of early-returning with `loading` stuck true. A failed fetch
        // also stays unmarked, allowing a retry on the next open.
        loadedFor.current = vehicleId;
      })
      .catch(() => {
        if (!cancelled) setSessions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [vehicleId]);

  const fuse = useMemo(
    () => new Fuse(sessions, { keys: ["name"], threshold: 0.3, ignoreLocation: true }),
    [sessions],
  );

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return sessions;
    return fuse.search(q).map((r) => r.item);
  }, [sessions, fuse, query]);

  return (
    <div className="border-t pt-1">
      <div className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Sessions
      </div>
      <div className="px-2 pb-1">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder="Search sessions…"
          className="h-8 text-xs"
        />
      </div>
      <div className="max-h-[160px] overflow-auto">
        {loading ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            {sessions.length === 0 ? "No sessions" : "No matches"}
          </div>
        ) : (
          filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              // Mousedown (not click) to beat the document-level close handler.
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(s);
              }}
              className={cn(
                "flex w-full flex-col items-start px-3 py-1.5 text-left hover:bg-accent",
                s.id === selectedSessionId && "bg-accent",
              )}
            >
              <span className="truncate text-sm">{s.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {formatSessionMeta(s)}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

interface TimeframePickerProps {
  value: Timeframe;
  onChange: (next: Timeframe) => void;
  className?: string;
  /** Vehicle to scope the sessions list to. */
  vehicleId: string;
  /** Called when a session is picked (so the page can load its laps). */
  onSelectSession?: (session: Session) => void;
  /** Currently-selected session id, for highlighting its row. */
  selectedSessionId?: string;
}

export function TimeframePicker({
  value,
  onChange,
  className,
  vehicleId,
  onSelectSession,
  selectedSessionId,
}: TimeframePickerProps) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) return;
    // Seed with the absolute range so either side is directly editable; typing
    // a shortcut like `1h` still works (the parser tries presets/shortcuts too).
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

  // Run the calendar's range string through the same parser (single commit path).
  function commitRangeString(rangeString: string) {
    const parsed = parseTimeframeInput(rangeString);
    if (parsed) commit(parsed);
  }

  function pickSession(session: Session) {
    commit({
      start: new Date(session.start_time),
      end: new Date(session.end_time),
      label: session.name,
    });
    onSelectSession?.(session);
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
            // Mousedown (not click) to beat the document-level handler above.
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
        <CalendarRangePicker value={value} onApply={commitRangeString} />
        <SessionPicker
          vehicleId={vehicleId}
          selectedSessionId={selectedSessionId}
          onPick={pickSession}
        />
      </div>
    </div>
  );
}

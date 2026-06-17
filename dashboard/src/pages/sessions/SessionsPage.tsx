import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowDown, ArrowUp, ChevronsUpDown, Pencil, Plus } from "lucide-react";
import { format } from "date-fns";
import Layout from "@/components/Layout";
import FuzzyDateInput from "@/components/FuzzyDateInput";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useVehicle } from "@/lib/store";
import { fetchSessions, fetchDataDates } from "@/lib/sessions/api";
import { Session } from "@/models/session";
import { notify } from "@/lib/notify";

type SortKey = "name" | "start" | "duration" | "laps";
type SortDir = "asc" | "desc";

function dayKey(iso: string): string {
  return format(new Date(iso), "yyyy-MM-dd");
}

function formatTime(iso: string): string {
  return format(new Date(iso), "HH:mm:ss");
}

function formatDayHeader(iso: string): string {
  return format(new Date(iso), "EEEE, MMMM d, yyyy");
}

function durationMs(s: Session): number {
  return new Date(s.end_time).getTime() - new Date(s.start_time).getTime();
}

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const totalSec = Math.round(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

function formatLapMs(ms?: number): string {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return "—";
  const totalSec = ms / 1000;
  const m = Math.floor(totalSec / 60);
  const s = totalSec - m * 60;
  return `${m}:${s.toFixed(3).padStart(6, "0")}`;
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  className?: string;
}) {
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-1 hover:text-foreground"
      >
        {label}
        {active ? (
          dir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ChevronsUpDown className="h-3 w-3 opacity-50" />
        )}
      </button>
    </TableHead>
  );
}

export default function SessionsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentVehicle = useVehicle();
  const vehicleId = searchParams.get("vid") || currentVehicle.id;

  const [sessions, setSessions] = useState<Session[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("start");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const dayRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  useEffect(() => {
    if (!vehicleId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [s, dates] = await Promise.all([
          fetchSessions(vehicleId),
          fetchDataDates(vehicleId).catch(() => [] as string[]),
        ]);
        if (cancelled) return;
        setSessions(s);
        setAvailableDates(dates);
      } catch (e) {
        if (!cancelled) notify.error("Failed to load sessions: " + e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vehicleId]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  // Days that have at least one session, ordered by sortDir on start time.
  // Sessions within a day are sorted by the active sort key.
  const groups = useMemo(() => {
    const byDay = new Map<string, Session[]>();
    for (const s of sessions) {
      const k = dayKey(s.start_time);
      const arr = byDay.get(k);
      if (arr) arr.push(s);
      else byDay.set(k, [s]);
    }

    const cmp = (a: Session, b: Session): number => {
      let v = 0;
      switch (sortKey) {
        case "name":
          v = a.name.localeCompare(b.name);
          break;
        case "duration":
          v = durationMs(a) - durationMs(b);
          break;
        case "laps":
          v = (a.lap_summary?.count ?? 0) - (b.lap_summary?.count ?? 0);
          break;
        case "start":
        default:
          v =
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
      }
      return sortDir === "asc" ? v : -v;
    };

    const days = Array.from(byDay.keys()).sort((a, b) =>
      sortDir === "asc" ? a.localeCompare(b) : b.localeCompare(a),
    );

    return days.map((day) => ({
      day,
      sessions: [...(byDay.get(day) ?? [])].sort(cmp),
    }));
  }, [sessions, sortKey, sortDir]);

  // Scroll the matching (or nearest available) day group into view.
  const jumpToDay = (target: Date) => {
    const key = format(target, "yyyy-MM-dd");
    const exact = dayRefs.current[key];
    if (exact) {
      exact.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    // Fall back to the closest day that actually has sessions.
    const days = groups.map((g) => g.day);
    if (days.length === 0) return;
    const targetMs = target.getTime();
    let best = days[0];
    let bestDelta = Infinity;
    for (const d of days) {
      const delta = Math.abs(new Date(d).getTime() - targetMs);
      if (delta < bestDelta) {
        bestDelta = delta;
        best = d;
      }
    }
    dayRefs.current[best]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <Layout activeTab="sessions" headerTitle="Sessions">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <FuzzyDateInput
            onDateChange={jumpToDay}
            availableDates={availableDates}
            className="w-[360px]"
          />
          <Button onClick={() => navigate("/sessions/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New session
          </Button>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader
                  label="Name"
                  active={sortKey === "name"}
                  dir={sortDir}
                  onClick={() => toggleSort("name")}
                />
                <SortHeader
                  label="Time"
                  active={sortKey === "start"}
                  dir={sortDir}
                  onClick={() => toggleSort("start")}
                />
                <SortHeader
                  label="Duration"
                  active={sortKey === "duration"}
                  dir={sortDir}
                  onClick={() => toggleSort("duration")}
                />
                <SortHeader
                  label="Laps"
                  active={sortKey === "laps"}
                  dir={sortDir}
                  onClick={() => toggleSort("laps")}
                />
                <TableHead>Best lap</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loading && groups.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No sessions found
                  </TableCell>
                </TableRow>
              )}
              {groups.map((group) => (
                <DayGroup
                  key={group.day}
                  day={group.day}
                  sessions={group.sessions}
                  headerRef={(el) => (dayRefs.current[group.day] = el)}
                  onOpen={(id) => navigate(`/sessions/${id}`)}
                  onEdit={(id) => navigate(`/sessions/${id}/edit`)}
                />
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </Layout>
  );
}

function DayGroup({
  day,
  sessions,
  headerRef,
  onOpen,
  onEdit,
}: {
  day: string;
  sessions: Session[];
  headerRef: (el: HTMLTableRowElement | null) => void;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  return (
    <>
      <TableRow ref={headerRef} className="hover:bg-transparent">
        <TableCell
          colSpan={6}
          className="bg-muted/40 py-2 text-sm font-semibold text-muted-foreground"
        >
          {formatDayHeader(day + "T00:00:00")}
          <span className="ml-2 font-normal">({sessions.length})</span>
        </TableCell>
      </TableRow>
      {sessions.map((s) => {
        const ms = durationMs(s);
        const lapCount = s.lap_summary?.count ?? 0;
        return (
          <TableRow
            key={s.id}
            className="cursor-pointer"
            onClick={() => onOpen(s.id)}
          >
            <TableCell className="font-medium">{s.name || "Untitled"}</TableCell>
            <TableCell className="font-mono text-xs">
              {formatTime(s.start_time)}–{formatTime(s.end_time)}
            </TableCell>
            <TableCell className="text-xs">{formatDuration(ms)}</TableCell>
            <TableCell>
              {lapCount > 0 ? (
                <Badge variant="secondary">{lapCount}</Badge>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell className="font-mono text-xs">
              {formatLapMs(s.lap_summary?.best_ms)}
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Edit session"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(s.id);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        );
      })}
    </>
  );
}

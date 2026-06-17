import { ReactNode, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { Loader2, Pencil } from "lucide-react";
import Layout from "@/components/Layout";
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
import { fetchSessions, fetchSessionLaps } from "@/lib/sessions/api";
import { Lap, LapSummary, Session, hasAnalysis } from "@/models/session";
import { notify } from "@/lib/notify";

function formatDateTime(iso: string): string {
  return format(new Date(iso), "MMM d, yyyy HH:mm:ss");
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

// Derive aggregate stats from the persisted laps when the session has no
// stored lap_summary (e.g. an analysis that predates the summary field).
function computeSummary(laps: Lap[]): LapSummary | null {
  const durs = laps.map((l) => l.duration_ms).filter((d) => d > 0);
  if (durs.length === 0) return null;
  const sum = durs.reduce((a, b) => a + b, 0);
  return {
    count: durs.length,
    best_ms: Math.min(...durs),
    avg_ms: sum / durs.length,
    worst_ms: Math.max(...durs),
  };
}

function MetaRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="flex flex-col gap-1 p-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-lg">{value}</span>
    </Card>
  );
}

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentVehicle = useVehicle();

  const [session, setSession] = useState<Session | null>(null);
  const [laps, setLaps] = useState<Lap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const vehicleId = currentVehicle.id;
        const [all, lapList] = await Promise.all([
          vehicleId ? fetchSessions(vehicleId) : Promise.resolve([]),
          fetchSessionLaps(id).catch(() => [] as Lap[]),
        ]);
        if (cancelled) return;
        setSession(all.find((s) => s.id === id) ?? null);
        setLaps(lapList);
      } catch (e) {
        if (!cancelled) notify.error("Failed to load session: " + e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, currentVehicle.id]);

  const summary = useMemo<LapSummary | null>(() => {
    if (session?.lap_summary) return session.lap_summary;
    return computeSummary(laps);
  }, [session, laps]);

  const segments = useMemo<string[]>(() => {
    if (session && hasAnalysis(session.analysis)) {
      return Object.keys(session.analysis.segments ?? {});
    }
    return [];
  }, [session]);

  if (loading) {
    return (
      <Layout activeTab="sessions" headerTitle="Session">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!session) {
    return (
      <Layout activeTab="sessions" headerTitle="Session">
        <Card className="p-8 text-center text-muted-foreground">
          Session not found.
        </Card>
      </Layout>
    );
  }

  const durMs =
    new Date(session.end_time).getTime() -
    new Date(session.start_time).getTime();

  return (
    <Layout activeTab="sessions" headerTitle="Session">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">
              {session.name || "Untitled session"}
            </h1>
            {session.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {session.description}
              </p>
            )}
          </div>
          <Button onClick={() => navigate(`/sessions/${session.id}/edit`)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>

        <Card className="grid grid-cols-2 gap-4 p-6 md:grid-cols-4">
          <MetaRow label="Vehicle" value={session.vehicle_id} />
          <MetaRow label="Start" value={formatDateTime(session.start_time)} />
          <MetaRow label="End" value={formatDateTime(session.end_time)} />
          <MetaRow label="Duration" value={formatDuration(durMs)} />
        </Card>

        {segments.length > 0 && (
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Segments
            </h2>
            <div className="flex flex-wrap gap-2">
              {segments.map((name) => (
                <Badge key={name} variant="secondary">
                  {name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Lap summary
          </h2>
          {summary ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard label="Laps" value={String(summary.count)} />
              <StatCard label="Best" value={formatLapMs(summary.best_ms)} />
              <StatCard label="Average" value={formatLapMs(summary.avg_ms)} />
              <StatCard label="Worst" value={formatLapMs(summary.worst_ms)} />
            </div>
          ) : (
            <Card className="p-6 text-sm text-muted-foreground">
              No laps recorded for this session.
            </Card>
          )}
        </div>

        {laps.length > 0 && (
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Laps
            </h2>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Lap</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Sectors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {laps.map((lap) => (
                    <TableRow key={lap.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {lap.lap_number}
                          {lap.is_best && (
                            <Badge variant="default">best</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {formatLapMs(lap.duration_ms)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {lap.sectors.length === 0 && (
                            <span className="text-muted-foreground">—</span>
                          )}
                          {[...lap.sectors]
                            .sort((a, b) => a.sector_number - b.sector_number)
                            .map((sec) => (
                              <span
                                key={sec.id}
                                className="rounded bg-muted px-2 py-0.5 font-mono text-xs"
                              >
                                S{sec.sector_number}{" "}
                                {formatLapMs(sec.duration_ms)}
                              </span>
                            ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}

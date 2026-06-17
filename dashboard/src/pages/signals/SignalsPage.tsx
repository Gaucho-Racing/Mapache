import Layout from "@/components/Layout";
import { SignalWidget } from "@/components/signals/SignalWidget";
import {
  defaultTimeframe,
  type Timeframe,
  TimeframePicker,
} from "@/components/signals/TimeframePicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BACKEND_URL } from "@/consts/config";
import { getAxiosErrorMessage } from "@/lib/axios-error-handler";
import { notify } from "@/lib/notify";
import { useVehicle } from "@/lib/store";
import { cn } from "@/lib/utils";
import axios from "axios";
import type { ECharts } from "echarts/core";
import Fuse from "fuse.js";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Hand,
  Loader2,
  MousePointer,
  Plus,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type SortKey = "name" | "count" | "first_seen" | "last_seen";
type SortDir = "asc" | "desc";

// Initial direction per column: names A→Z, quantities biggest-first.
const DEFAULT_DIR: Record<SortKey, SortDir> = {
  name: "asc",
  count: "desc",
  first_seen: "desc",
  last_seen: "desc",
};

interface SignalRow {
  name: string;
  count: number;
  first_seen: string | null;
  last_seen: string | null;
}

function authHeader() {
  return {
    Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
  };
}

function formatCount(n: number): string {
  if (n < 1_000) return n.toString();
  if (n < 1_000_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}

function formatAbsolute(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString();
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function SortHeader({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = sortKey === activeKey;
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead
      onClick={() => onSort(sortKey)}
      className={cn(
        "cursor-pointer select-none whitespace-nowrap",
        align === "right" && "text-right",
      )}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <Icon className={cn("h-3 w-3", !active && "opacity-40")} />
      </span>
    </TableHead>
  );
}

function SignalsPage() {
  const vehicle = useVehicle();
  const [timeframe, setTimeframe] = useState<Timeframe>(defaultTimeframe);
  const [signals, setSignals] = useState<SignalRow[]>([]);
  const [loadingSignals, setLoadingSignals] = useState(false);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  // Shared left-drag mode: "select" brushes a timeframe, "pan" slides the zoom
  // window (broadcast across panels by the connect group). Wheel zooms in both.
  const [interactionMode, setInteractionMode] = useState<"select" | "pan">(
    "select",
  );

  // One unified widget per entry; it picks its own chart type. Seed with one.
  const [widgets, setWidgets] = useState<{ id: number }[]>(() => [{ id: 0 }]);
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(() => new Set());
  // Monotonic id counter; a ref so it can't go stale within a render.
  const nextWidgetId = useRef(1);

  // Shared connect group, syncing hover cursor + tooltip across panels.
  const SYNC_GROUP_ID = "signals-page";

  // Live chart instances. Group-wide dataZoom dispatched through any one is
  // rebroadcast to the rest (client-side only — no /query/run).
  const chartInstances = useRef<Set<ECharts>>(new Set());

  const onChartReady = useCallback((inst: ECharts | null) => {
    // No null-with-same-ref on teardown, so prune disposed instances at dispatch.
    if (inst) chartInstances.current.add(inst);
  }, []);

  // First non-disposed instance is authoritative (all share one zoom window).
  const liveInstance = (): ECharts | null => {
    for (const inst of chartInstances.current) {
      if (inst.isDisposed()) {
        chartInstances.current.delete(inst);
        continue;
      }
      return inst;
    }
    return null;
  };

  // Dispatch a dataZoom window (percent 0–100); rebroadcast to the group.
  const dispatchZoom = (start: number, end: number) => {
    const inst = liveInstance();
    if (!inst) return;
    inst.dispatchAction({ type: "dataZoom", start, end });
  };

  // Snap back to the full fetched window.
  const resetZoom = () => dispatchZoom(0, 100);

  const addWidget = () => {
    setWidgets((prev) => [...prev, { id: nextWidgetId.current++ }]);
  };

  const deleteWidget = (id: number) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
    setHiddenIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const toggleHide = (id: number) => {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const rangeSeconds = useMemo(
    () => (timeframe.end.getTime() - timeframe.start.getTime()) / 1000,
    [timeframe],
  );

  // ISO strings drive the fetch effects, so they re-run only when start/end
  // actually move, not on every Timeframe identity change.
  const startIso = useMemo(() => timeframe.start.toISOString(), [timeframe]);
  const endIso = useMemo(() => timeframe.end.toISOString(), [timeframe]);

  // A user-drawn brush always lands as "Custom" (presets re-snap to now).
  const onBrushSelect = (start: Date, end: Date) => {
    setTimeframe({ start, end, label: "Custom" });
  };

  // The table refetches only on vehicle change, not on query/timeframe edits.
  useEffect(() => {
    if (!vehicle.id) return;
    fetchSignals();
  }, [vehicle.id, vehicle.type]);

  // The collected-signals table is unbounded by the timeframe ("everything ever
  // seen for this vehicle") — omitting start/end skips the backend's
  // produced_at filter. Kerbecs nests the upstream body at response.data.data.
  const fetchSignals = async () => {
    setLoadingSignals(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/query/signals`, {
        headers: authHeader(),
        params: { vehicle_id: vehicle.id },
      });
      setSignals(res.data.data?.data ?? []);
    } catch (e) {
      notify.error(getAxiosErrorMessage(e));
    } finally {
      setLoadingSignals(false);
    }
  };

  // Rebuild the Fuse index only when the signal list changes. Threshold 0.3
  // forgives typos; ignoreLocation matches anywhere in `subsystem_metric` names.
  const fuse = useMemo(
    () =>
      new Fuse(signals, {
        keys: ["name"],
        threshold: 0.3,
        ignoreLocation: true,
      }),
    [signals],
  );

  const filteredSignals = useMemo(() => {
    const q = search.trim();
    // Fuse ranks by relevance; sorting applies only when not searching.
    if (q) return fuse.search(q).map((r) => r.item);

    const sorted = [...signals];
    const dir = sortDir === "asc" ? 1 : -1;
    sorted.sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "count":
          return (a.count - b.count) * dir;
        case "first_seen":
        case "last_seen": {
          // null timestamps sink to the bottom regardless of direction.
          const av = a[sortKey];
          const bv = b[sortKey];
          if (av === null && bv === null) return 0;
          if (av === null) return 1;
          if (bv === null) return -1;
          return (new Date(av).getTime() - new Date(bv).getTime()) * dir;
        }
      }
    });
    return sorted;
  }, [signals, fuse, search, sortKey, sortDir]);

  const onSort = (key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir(DEFAULT_DIR[key]);
      return key;
    });
  };

  return (
    <Layout activeTab="signals" headerTitle="Signals">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              All signals collected for{" "}
              <span className="font-semibold">{vehicle.name}</span> over the
              selected timeframe.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Left-drag mode: Select brushes a timeframe (refetches), Pan
                slides the client-side zoom window. */}
            <div className="flex items-center rounded-md border">
              <Button
                variant={interactionMode === "select" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-r-none border-0"
                onClick={() => setInteractionMode("select")}
                title="Select: drag to set the timeframe"
              >
                <MousePointer className="mr-2 h-4 w-4" />
                Select
              </Button>
              <Button
                variant={interactionMode === "pan" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-l-none border-0"
                onClick={() => setInteractionMode("pan")}
                title="Pan: drag to slide the zoom window"
              >
                <Hand className="mr-2 h-4 w-4" />
                Pan
              </Button>
            </div>
            {/* Snap the synced panels back to the full fetched window — no requery. */}
            <Button
              variant="outline"
              size="sm"
              onClick={resetZoom}
              title="Reset zoom to the full queried window"
            >
              Reset zoom
            </Button>
            <TimeframePicker value={timeframe} onChange={setTimeframe} />
          </div>
        </div>

        {widgets.map(({ id }) => (
          // Only the widget's time-series chart joins the shared hover/zoom group.
          <SignalWidget
            key={id}
            vehicleId={vehicle.id}
            vehicleType={vehicle.type}
            signalNames={signals.map((s) => s.name)}
            startIso={startIso}
            endIso={endIso}
            rangeSeconds={rangeSeconds}
            groupId={SYNC_GROUP_ID}
            hidden={hiddenIds.has(id)}
            onToggleHide={() => toggleHide(id)}
            onDelete={() => deleteWidget(id)}
            onBrushSelect={onBrushSelect}
            onChartReady={onChartReady}
            interactionMode={interactionMode}
          />
        ))}

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => addWidget()}>
            <Plus className="mr-2 h-4 w-4" />
            Add widget
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>
                Collected signals{" "}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {loadingSignals
                    ? ""
                    : `${filteredSignals.length} unique · all time`}
                </span>
              </CardTitle>
              <div className="relative w-[280px]">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search signals…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingSignals ? (
              <div className="flex h-[200px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredSignals.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                No signals collected in this window
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHeader
                      label="Signal"
                      sortKey="name"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={onSort}
                    />
                    <SortHeader
                      label="Count"
                      sortKey="count"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={onSort}
                      align="right"
                    />
                    <SortHeader
                      label="First seen"
                      sortKey="first_seen"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={onSort}
                      align="right"
                    />
                    <SortHeader
                      label="Last seen"
                      sortKey="last_seen"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={onSort}
                      align="right"
                    />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSignals.map((s) => (
                    <TableRow key={s.name}>
                      <TableCell className="font-mono">{s.name}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCount(s.count)}
                      </TableCell>
                      <TableCell
                        className="text-right text-sm text-muted-foreground"
                        title={formatAbsolute(s.first_seen)}
                      >
                        {formatRelative(s.first_seen)}
                      </TableCell>
                      <TableCell
                        className="text-right text-sm text-muted-foreground"
                        title={formatAbsolute(s.last_seen)}
                      >
                        {formatRelative(s.last_seen)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

export default SignalsPage;

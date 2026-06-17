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

// Sensible initial direction per column: alphabetical names go A→Z,
// quantities go biggest-first.
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
  // Locale-aware full timestamp; the trailing 'Z' from the backend means
  // `new Date` parses as UTC and `toLocaleString` renders in the user's
  // timezone — matches the bucket tick labels.
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
  // Left-drag gesture mode shared by every signal chart. "select" (default) is
  // the original brush-to-set-timeframe; "pan" hands left-drag to the inside
  // dataZoom so the user slides the (already-fetched) zoom window — which the
  // `connect` group broadcasts across all panels. Wheel-zoom works in both.
  const [interactionMode, setInteractionMode] = useState<"select" | "pan">(
    "select",
  );

  // Stacked chart widgets — one unified, all-encompassing widget that picks its
  // own chart type (bar/line/area/scatter/path/3D/categorical) from its chart-
  // type selector. All per-chart state lives inside the widget component. Seed
  // with one so the page opens to exactly the old single-chart experience.
  const [widgets, setWidgets] = useState<{ id: number }[]>(() => [{ id: 0 }]);
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(() => new Set());
  // Monotonic counter for stable widget keys across add/delete. A ref (not
  // state) so it never goes stale within a render and double-clicks can't
  // mint the same id.
  const nextWidgetId = useRef(1);

  // Single ECharts connection group shared by every widget on the page —
  // joining it syncs the hover cursor + tooltip across all panels.
  const SYNC_GROUP_ID = "signals-page";

  // Live chart instances, keyed by their DOM id so add/hide/delete keep the
  // set accurate. We dispatch group-wide dataZoom (zoom out / reset) through
  // any one of them — `echarts.connect` rebroadcasts the action to the rest,
  // so a single dispatch zooms every synced panel. Purely client-side: it
  // magnifies the already-fetched buckets and fires no `/query/run`.
  const chartInstances = useRef<Set<ECharts>>(new Set());

  const onChartReady = useCallback((inst: ECharts | null) => {
    // QueryChart calls this with the instance on init; we can't get `null`
    // back with the same reference on teardown, so each chart re-registers
    // on mount and we prune disposed instances at dispatch time.
    if (inst) chartInstances.current.add(inst);
  }, []);

  // Read the current zoom window from any live chart. All synced panels share
  // the same window, so the first non-disposed instance is authoritative.
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

  // Dispatch a dataZoom window [start, end] (percent 0–100) to the group.
  // One dispatchAction on any grouped instance is rebroadcast to all.
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

  // ISO strings drive the fetch effects; deriving via Date.getTime() means
  // we re-run the effect only when start/end actually move, not on every
  // Timeframe object identity change.
  const startIso = useMemo(() => timeframe.start.toISOString(), [timeframe]);
  const endIso = useMemo(() => timeframe.end.toISOString(), [timeframe]);

  // Brush-select callback shared by every widget's chart. Whichever panel
  // the user drags on sets the page timeframe and all widgets refetch.
  // Always lands as "Custom" since the user drew it themselves; presets
  // re-snap to now when clicked.
  const onBrushSelect = (start: Date, end: Date) => {
    setTimeframe({ start, end, label: "Custom" });
  };

  // The table doesn't refetch every time the user iterates on a query or
  // scrubs the timeframe — only on vehicle change.
  useEffect(() => {
    if (!vehicle.id) return;
    fetchSignals();
  }, [vehicle.id, vehicle.type]);

  // Kerbecs wraps every upstream response in
  //   { status, ping, gateway, service, timestamp, data: <upstream-body> }
  // so the upstream's own JSON sits at axios `response.data.data`.
  //
  // The collected-signals table is deliberately unbounded by the page's
  // timeframe — it's "everything we've ever seen for this vehicle",
  // independent of what the chart is scoped to. Omitting start/end makes
  // the backend skip its produced_at filter, so the query runs against
  // the full partition set.
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

  // Rebuild the Fuse index only when the signal list changes — searching
  // is cheap, indexing isn't. Threshold 0.3 forgives typos and missing
  // characters ("accmltr" → "accumulator") without surfacing unrelated
  // matches; ignoreLocation lets a match score the same wherever it sits
  // in the string, which matters for our `subsystem_metric` names.
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
    // Fuse already ranks by relevance; sorting only kicks in when the
    // user isn't actively searching, otherwise we'd shuffle the ranked
    // results back into alphabetical order.
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
          // null timestamps sink to the bottom regardless of direction
          // — they're "no data" rather than "infinitely old/new".
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
            {/* Left-drag interaction mode. "Select" brushes a timeframe (the
                original behavior, refetches at true resolution); "Pan" slides
                the client-side zoom window across every synced panel. Wheel
                still zooms in either mode. A segmented pair styled to sit with
                the zoom controls. */}
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
            {/* Client-side zoom control: snap the synced panels back to the
                full fetched window via ECharts dataZoom — no requery. The
                brush (drag on a chart) still sets the timeframe and refetches
                for true resolution; the wheel zooms in. */}
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
          // The unified widget self-gates page group participation: only its
          // time-series chart wires onChartReady/groupId into the shared hover/
          // zoom group; pairs/categorical charts ignore them (their axes aren't
          // the shared time axis). All share the page timeframe via startIso/endIso.
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

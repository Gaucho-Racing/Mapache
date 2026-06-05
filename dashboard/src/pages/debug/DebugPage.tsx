import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import MessageTraceDialog from "@/components/debug/MessageTraceDialog";
import { BACKEND_URL } from "@/consts/config";
import { formatCount } from "@/lib/job-stream";
import { useVehicle, useVehicleList } from "@/lib/store";
import { formatTimeWithMillis } from "@/lib/utils";
import {
  LiveSignalState,
  LiveTransport,
  SeriesPoint,
  useLiveSignals,
} from "@/lib/useLiveSignals";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  LineChart as LineChartIcon,
  Table as TableIcon,
  X,
} from "lucide-react";
import {
  MutableRefObject,
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ReadyState } from "react-use-websocket";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

type SortKey = "name" | "value" | "rawValue" | "lastSeen" | "count";
type SortDir = "asc" | "desc";

// Cap table + graph re-render rate. Ingest runs at WS/SSE rate into refs;
// the views only paint this often.
const FLUSH_INTERVAL_MS = 200;
// Series buffer is sized for the largest selectable window so switching
// 5s → 60s shows what's already been collected without warm-up.
const WINDOW_PRESETS_SEC = [5, 10, 30, 60] as const;
type WindowSec = (typeof WINDOW_PRESETS_SEC)[number];
const MAX_WINDOW_SEC = WINDOW_PRESETS_SEC[WINDOW_PRESETS_SEC.length - 1];
const SERIES_KEEP_MS = MAX_WINDOW_SEC * 1000 + 2_000;

// Stable palette for the graph. colorFor hashes the signal name so the same
// signal keeps the same color across add/remove cycles.
const PALETTE = [
  "#e105a3",
  "#8412fc",
  "#10b981",
  "#f59e0b",
  "#3b82f6",
  "#ef4444",
  "#06b6d4",
  "#f97316",
  "#a855f7",
  "#22c55e",
];

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function formatBytes(b: number): string {
  if (!Number.isFinite(b) || b < 0) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024)
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function rawToHex(n: number): string {
  if (!Number.isFinite(n) || !Number.isInteger(n)) return String(n);
  if (n >= 0) return "0x" + n.toString(16).toUpperCase();
  if (n >= -0x80)
    return "0x" + (n & 0xff).toString(16).toUpperCase().padStart(2, "0");
  if (n >= -0x8000)
    return "0x" + (n & 0xffff).toString(16).toUpperCase().padStart(4, "0");
  if (n >= -0x80000000)
    return "0x" + (n >>> 0).toString(16).toUpperCase().padStart(8, "0");
  return n.toString();
}

// ---------- Bridge ----------

// LiveBridge owns the live-service connection. It's a null-rendering memo
// so signal-rate state updates inside useWebSocket / setSseReady never
// reach DebugPage — only refs mutate.
const LiveBridge = memo(function LiveBridge({
  vehicleId,
  transport,
  signals,
  backfillSec,
  rateHz,
  latestRef,
  seriesRef,
  totalRef,
  backfillRef,
  onReadyChange,
}: {
  vehicleId: string | undefined;
  transport: LiveTransport;
  signals: string;
  backfillSec: number;
  rateHz: number;
  latestRef: MutableRefObject<Map<string, LiveSignalState>>;
  seriesRef: MutableRefObject<Map<string, SeriesPoint[]>>;
  totalRef: MutableRefObject<number>;
  backfillRef: MutableRefObject<number>;
  onReadyChange: (state: ReadyState) => void;
}) {
  useLiveSignals({
    vehicleId,
    transport,
    signals,
    backfillSec,
    rateHz,
    seriesWindowMs: SERIES_KEEP_MS,
    latestRef,
    seriesRef,
    totalRef,
    backfillRef,
    onReadyChange,
  });
  return null;
});

// ---------- Table ----------

const SignalRowView = memo(
  function SignalRowView({
    s,
    now,
    isGraphed,
    onSelect,
    onToggleGraph,
  }: {
    s: LiveSignalState;
    now: number;
    isGraphed: boolean;
    onSelect: (s: LiveSignalState) => void;
    onToggleGraph: (name: string) => void;
  }) {
    const ageMs = Math.max(0, now - s.lastSeen);
    const ageColor =
      ageMs < 500
        ? "text-green-500"
        : ageMs < 5000
          ? "text-yellow-500"
          : "text-red-500";
    const clickable = s.id != null;
    return (
      <TableRow
        className={clickable ? "cursor-pointer" : ""}
        onClick={clickable ? () => onSelect(s) : undefined}
      >
        <TableCell className="font-mono text-xs">{s.name}</TableCell>
        <TableCell className="font-mono">{s.value}</TableCell>
        <TableCell className="font-mono text-muted-foreground">
          {s.rawValue}
        </TableCell>
        <TableCell className="font-mono text-muted-foreground">
          {rawToHex(s.rawValue)}
        </TableCell>
        <TableCell className="font-mono text-xs text-muted-foreground">
          {formatTimeWithMillis(new Date(s.producedAt))}
        </TableCell>
        <TableCell className={`font-mono text-xs ${ageColor}`}>
          {ageMs < 1000 ? `${ageMs}ms` : `${(ageMs / 1000).toFixed(1)}s`}
        </TableCell>
        <TableCell>
          <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs">
            {s.count}
          </span>
        </TableCell>
        <TableCell
          className="cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onToggleGraph(s.name);
          }}
          title={isGraphed ? "Remove from graph" : "Add to graph"}
        >
          <LineChartIcon
            className={`h-4 w-4 ${
              isGraphed ? "" : "text-muted-foreground opacity-50"
            }`}
            style={isGraphed ? { color: colorFor(s.name) } : undefined}
          />
        </TableCell>
      </TableRow>
    );
  },
  (prev, next) =>
    prev.s === next.s &&
    prev.isGraphed === next.isGraphed &&
    Math.abs(prev.now - next.now) < 100 &&
    prev.onSelect === next.onSelect &&
    prev.onToggleGraph === next.onToggleGraph,
);

const DebugTable = memo(function DebugTable({
  rows,
  now,
  sortKey,
  sortDir,
  graphedSet,
  search,
  onSort,
  onSelect,
  onToggleGraph,
  onSearchChange,
  onCollapse,
  emptyMessage,
}: {
  rows: LiveSignalState[];
  now: number;
  sortKey: SortKey;
  sortDir: SortDir;
  graphedSet: Set<string>;
  search: string;
  onSort: (key: SortKey) => void;
  onSelect: (s: LiveSignalState) => void;
  onToggleGraph: (name: string) => void;
  onSearchChange: (v: string) => void;
  onCollapse: () => void;
  emptyMessage: string;
}) {
  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k)
      return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="ml-1 inline h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 inline h-3 w-3" />
    );
  };

  const headerCell = (label: string, key: SortKey) => (
    <TableHead
      className="cursor-pointer select-none whitespace-nowrap"
      onClick={() => onSort(key)}
    >
      {label}
      <SortIcon k={key} />
    </TableHead>
  );

  return (
    <Card className="flex h-full flex-col overflow-hidden p-0">
      <div className="flex shrink-0 items-center gap-3 border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <TableIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Live Signals</span>
        </div>
        <Input
          className="ml-auto h-8 max-w-xs"
          placeholder="Filter by signal name..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <button
          onClick={onCollapse}
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          title="Collapse"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              {headerCell("Signal", "name")}
              {headerCell("Value", "value")}
              {headerCell("Raw", "rawValue")}
              {headerCell("Raw (hex)", "rawValue")}
              {headerCell("Produced At", "lastSeen")}
              {headerCell("Age", "lastSeen")}
              {headerCell("Count", "count")}
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-8 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((s) => (
                <SignalRowView
                  key={s.name}
                  s={s}
                  now={now}
                  isGraphed={graphedSet.has(s.name)}
                  onSelect={onSelect}
                  onToggleGraph={onToggleGraph}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
});

// ---------- Collapsed stripe ----------

// CollapsedStripe is the thin vertical card a collapsed panel shrinks into.
// expandDirection points the chevron toward where the panel grows when the
// user clicks: 'right' for a left-side strip (table), 'left' for a
// right-side strip (graph).
const CollapsedStripe = memo(function CollapsedStripe({
  label,
  icon,
  expandDirection,
  onExpand,
}: {
  label: string;
  icon: React.ReactNode;
  expandDirection: "left" | "right";
  onExpand: () => void;
}) {
  const Chevron = expandDirection === "right" ? ChevronRight : ChevronLeft;
  return (
    <Card
      className="flex h-full cursor-pointer flex-col items-center gap-3 p-2 hover:bg-accent/50"
      onClick={onExpand}
      title={`Show ${label}`}
    >
      <Chevron className="h-4 w-4 text-muted-foreground" />
      {icon}
      <div className="text-xs font-medium text-muted-foreground [text-orientation:mixed] [writing-mode:vertical-rl]">
        {label}
      </div>
    </Card>
  );
});

// ---------- Graph ----------

interface ChartRow {
  t: number; // seconds before now, negative
  [signal: string]: number;
}

function buildChartData(
  seriesByName: Map<string, SeriesPoint[]>,
  selected: string[],
  windowMs: number,
): ChartRow[] {
  const now = Date.now();
  const cutoff = now - windowMs;
  const byTs = new Map<number, Record<string, number>>();
  for (const name of selected) {
    const series = seriesByName.get(name);
    if (!series) continue;
    for (const p of series) {
      if (p.t < cutoff) continue;
      let row = byTs.get(p.t);
      if (!row) {
        row = {};
        byTs.set(p.t, row);
      }
      row[name] = p.v;
    }
  }
  const sortedTs = Array.from(byTs.keys()).sort((a, b) => a - b);
  return sortedTs.map((t) => ({
    t: (t - now) / 1000,
    ...byTs.get(t)!,
  }));
}

const GraphSignalPicker = memo(function GraphSignalPicker({
  selected,
  available,
  onAdd,
  onRemove,
}: {
  selected: string[];
  available: string[];
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const candidates = useMemo(() => {
    const sel = new Set(selected);
    const q = search.trim().toLowerCase();
    return available
      .filter((n) => !sel.has(n))
      .filter((n) => q === "" || n.toLowerCase().includes(q))
      .sort()
      .slice(0, 100);
  }, [search, available, selected]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {selected.map((name) => (
        <Badge
          key={name}
          variant="secondary"
          className="cursor-pointer gap-1 font-mono"
          onClick={() => onRemove(name)}
          title="Remove from graph"
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: colorFor(name) }}
          />
          {name}
          <X className="h-3 w-3" />
        </Badge>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            + Add signal
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2" align="start">
          <Input
            placeholder="Search signals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className="mt-2 max-h-60 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {candidates.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground">
                {available.length === 0
                  ? "Waiting for signals..."
                  : "No matches"}
              </div>
            ) : (
              candidates.map((name) => (
                <div
                  key={name}
                  className="cursor-pointer rounded px-2 py-1 font-mono text-xs hover:bg-accent"
                  onClick={() => {
                    onAdd(name);
                    setSearch("");
                  }}
                >
                  {name}
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
});

function xAxisTicks(windowSec: number): number[] {
  const step =
    windowSec <= 5 ? 1 : windowSec <= 10 ? 2 : windowSec <= 30 ? 5 : 10;
  const ticks: number[] = [];
  for (let t = -windowSec; t <= 0; t += step) ticks.push(t);
  if (ticks[ticks.length - 1] !== 0) ticks.push(0);
  return ticks;
}

// computeYDomain returns a [min, max] with ~10% padding above and below the
// visible data range. Recharts' default `auto` pins to 0 on positive-only
// series which compresses signals far from zero (e.g. ECU temperatures).
function computeYDomain(
  data: ChartRow[],
  selected: string[],
): [number, number] | undefined {
  let min = Infinity;
  let max = -Infinity;
  for (const row of data) {
    for (const name of selected) {
      const v = row[name];
      if (typeof v === "number" && Number.isFinite(v)) {
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
  }
  if (!Number.isFinite(min)) return undefined;
  const range = max - min;
  // Constant signals get a synthetic band so the line isn't pinned to the
  // exact edge of the plot area.
  const pad = range === 0 ? Math.max(Math.abs(max) * 0.1, 1) : range * 0.1;
  return [min - pad, max + pad];
}

const GraphCard = memo(function GraphCard({
  selected,
  data,
  windowSec,
}: {
  selected: string[];
  data: ChartRow[];
  windowSec: number;
}) {
  const config = useMemo(() => {
    const c: Record<string, { color: string; label: string }> = {};
    for (const name of selected) {
      c[name] = { color: colorFor(name), label: name };
    }
    return c;
  }, [selected]);

  const xTicks = useMemo(() => xAxisTicks(windowSec), [windowSec]);
  const yDomain = useMemo(
    () => computeYDomain(data, selected),
    [data, selected],
  );

  if (selected.length === 0) {
    return (
      <div className="flex h-full min-h-[240px] items-center justify-center text-sm text-muted-foreground">
        Pick a signal above (or click the chart icon on a table row) to start
        graphing.
      </div>
    );
  }

  return (
    <ChartContainer className="!aspect-auto h-full min-h-[240px] w-full" config={config}>
      <LineChart
        data={data}
        margin={{ top: 10, right: 16, left: 0, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="t"
          type="number"
          domain={[-windowSec, 0]}
          ticks={xTicks}
          tickFormatter={(v) => `${v.toFixed(0)}s`}
          allowDataOverflow
        />
        <YAxis width={60} domain={yDomain ?? ["auto", "auto"]} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(value: unknown) =>
                typeof value === "number" ? `${value.toFixed(1)}s` : String(value)
              }
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        {selected.map((name) => (
          <Line
            key={name}
            type="monotone"
            dataKey={name}
            stroke={colorFor(name)}
            strokeWidth={1.5}
            isAnimationActive={false}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
});

// ---------- Page ----------

export default function DebugPage() {
  const vehicle = useVehicle();
  const vehicleList = useVehicleList();

  const vehicleType = useMemo(() => {
    const v = vehicleList.find((x) => x.id === vehicle.id);
    return v?.type ?? vehicle.type;
  }, [vehicle.id, vehicleList, vehicle.type]);

  const latestRef = useRef<Map<string, LiveSignalState>>(new Map());
  const seriesRef = useRef<Map<string, SeriesPoint[]>>(new Map());
  const totalRef = useRef(0);
  const backfillRef = useRef(0);
  const lastSampleRef = useRef({ at: Date.now(), total: 0 });

  const [transport, setTransport] = useState<LiveTransport>("sse");
  const [tick, setTick] = useState(0);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [readyState, setReadyState] = useState<ReadyState>(
    ReadyState.UNINSTANTIATED,
  );
  const [msgsPerSec, setMsgsPerSec] = useState(0);
  const [graphed, setGraphed] = useState<string[]>([]);
  const [windowSec, setWindowSec] = useState<WindowSec>(10);
  const [tableCollapsed, setTableCollapsed] = useState(false);
  const [graphCollapsed, setGraphCollapsed] = useState(false);
  // Two-stage state for the server-side subscription: `signalsDraft` is the
  // editing buffer, `signalsApplied` is what's actually on the URL. Commits
  // on blur / Enter so we don't tear down the connection on every keystroke.
  const [signalsDraft, setSignalsDraft] = useState("*");
  const [signalsApplied, setSignalsApplied] = useState("*");
  const [serviceStats, setServiceStats] = useState<{
    subscriptions: {
      vehicles: number;
      exact: number;
      patterns: number;
    };
    cache: {
      vehicles: number;
      buckets: number;
      signals: number;
      bytes: number;
      window_sec: number;
    };
    latency: {
      ewma_ms: number;
      samples: number;
    };
  } | null>(null);
  const graphedSet = useMemo(() => new Set(graphed), [graphed]);
  const [selected, setSelected] = useState<{
    signalId: string;
    signalName: string;
  } | null>(null);

  const onSelect = useCallback((s: LiveSignalState) => {
    if (!s.id) return;
    setSelected({ signalId: s.id, signalName: s.name });
  }, []);

  const onReadyChange = useCallback((state: ReadyState) => {
    setReadyState(state);
  }, []);

  const onToggleGraph = useCallback((name: string) => {
    setGraphed((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  }, []);

  // Empty subscription falls back to "*" so we don't break the connection.
  // Also reflect that fallback back into the input so the field never lies
  // about what's actually subscribed.
  const commitSignals = useCallback(() => {
    const next = signalsDraft.trim() || "*";
    if (next !== signalsDraft) setSignalsDraft(next);
    setSignalsApplied((prev) => (next === prev ? prev : next));
  }, [signalsDraft]);

  const isSubDirty = (signalsDraft.trim() || "*") !== signalsApplied;

  const onCollapseTable = useCallback(() => setTableCollapsed(true), []);
  const onExpandTable = useCallback(() => setTableCollapsed(false), []);
  const onCollapseGraph = useCallback(() => setGraphCollapsed(true), []);
  const onExpandGraph = useCallback(() => setGraphCollapsed(false), []);

  // Poll the live service's /stats endpoint for server-side subscription
  // counts. Cheap (one tiny JSON every 5s) and decoupled from the WS/SSE
  // stream — gives us "who else is connected" visibility independent of
  // this page's own connection. kerbecs wraps default-envelope responses
  // as { data, error, ... }, so we unwrap before storing.
  useEffect(() => {
    const ac = new AbortController();
    const fetchStats = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/live/stats`, {
          signal: ac.signal,
        });
        if (!res.ok) return;
        const body = await res.json();
        setServiceStats(body?.data ?? body);
      } catch {
        /* ignore aborts / transient network errors */
      }
    };
    fetchStats();
    const id = setInterval(fetchStats, 5000);
    return () => {
      ac.abort();
      clearInterval(id);
    };
  }, []);

  // Pause the flush when the tab is hidden — no point repainting unseen
  // views. Messages still flow into refs.
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (id != null) return;
      id = setInterval(() => {
        const now = Date.now();
        const dtMs = now - lastSampleRef.current.at;
        if (dtMs > 0) {
          const dCount = totalRef.current - lastSampleRef.current.total;
          setMsgsPerSec((dCount * 1000) / dtMs);
          lastSampleRef.current = { at: now, total: totalRef.current };
        }
        setTick((t) => t + 1);
      }, FLUSH_INTERVAL_MS);
    };
    const stop = () => {
      if (id == null) return;
      clearInterval(id);
      id = null;
    };
    const onVis = () => {
      if (document.hidden) stop();
      else start();
    };
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      stop();
    };
  }, []);

  const onSort = useCallback((key: SortKey) => {
    setSortKey((prevKey) => {
      if (prevKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prevKey;
      }
      setSortDir(key === "name" ? "asc" : "desc");
      return key;
    });
  }, []);

  const rows = useMemo(() => {
    const list = Array.from(latestRef.current.values());
    const q = deferredSearch.trim().toLowerCase();
    const filtered = q
      ? list.filter((s) => s.name.toLowerCase().includes(q))
      : list;
    const dir = sortDir === "asc" ? 1 : -1;
    filtered.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number")
        return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    return filtered;
    // tick gates re-renders; latestRef mutates between ticks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, deferredSearch, sortKey, sortDir]);

  const availableSignals = useMemo(() => {
    return Array.from(latestRef.current.keys());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const chartData = useMemo(() => {
    if (graphed.length === 0) return [];
    return buildChartData(seriesRef.current, graphed, windowSec * 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, graphed, windowSec]);

  const distinctCount = latestRef.current.size;
  const totalCount = totalRef.current;
  const backfillCount = backfillRef.current;
  const renderNow = Date.now();

  const connectionStatus = {
    [ReadyState.CONNECTING]: "Connecting",
    [ReadyState.OPEN]: "Connected",
    [ReadyState.CLOSING]: "Closing",
    [ReadyState.CLOSED]: "Disconnected",
    [ReadyState.UNINSTANTIATED]: "Idle",
  }[readyState];

  const statusColor = {
    [ReadyState.OPEN]: "bg-green-600",
    [ReadyState.CONNECTING]: "bg-yellow-600",
    [ReadyState.CLOSING]: "bg-yellow-600",
    [ReadyState.CLOSED]: "bg-red-600",
    [ReadyState.UNINSTANTIATED]: "bg-neutral-600",
  }[readyState];

  const emptyMessage =
    readyState === ReadyState.OPEN
      ? "Connected — waiting for signals..."
      : `Socket ${connectionStatus.toLowerCase()}`;

  return (
    <Layout activeTab="debug" headerTitle="Debug">
      <LiveBridge
        vehicleId={vehicle.id}
        transport={transport}
        signals={signalsApplied}
        backfillSec={60}
        rateHz={5}
        latestRef={latestRef}
        seriesRef={seriesRef}
        totalRef={totalRef}
        backfillRef={backfillRef}
        onReadyChange={onReadyChange}
      />

      <div className="flex h-[calc(100vh-7.5rem)] flex-col gap-4">
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${statusColor}`}
              />
              <span className="text-sm font-medium">{connectionStatus}</span>
            </div>

            <div className="flex items-center gap-1 rounded-md border p-0.5 text-xs">
              {(["ws", "sse"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTransport(t)}
                  className={`rounded px-2 py-1 font-mono uppercase ${
                    transport === t
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="text-sm text-muted-foreground">
              Vehicle:{" "}
              <span className="font-medium text-foreground">{vehicle.id}</span>{" "}
              <span className="text-xs">({vehicleType})</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Distinct:{" "}
              <span className="font-medium text-foreground">
                {distinctCount}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Total:{" "}
              <span className="font-medium text-foreground">{totalCount}</span>
              {backfillCount > 0 && (
                <span className="ml-1 text-xs">
                  ({backfillCount} backfill)
                </span>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              Rate:{" "}
              <span className="font-medium text-foreground">
                {msgsPerSec.toFixed(0)}
              </span>{" "}
              <span className="text-xs">msg/s</span>
            </div>

            {serviceStats && (
              <>
                <div
                  className="text-sm text-muted-foreground"
                  title={`EWMA across ${serviceStats.latency.samples.toLocaleString()} signals seen by the live service since startup`}
                >
                  Ingest latency:{" "}
                  <span className="font-medium text-foreground">
                    {serviceStats.latency.samples > 0
                      ? serviceStats.latency.ewma_ms.toFixed(0)
                      : "—"}
                  </span>{" "}
                  <span className="text-xs">ms</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Subs:{" "}
                  <span className="font-medium text-foreground">
                    {serviceStats.subscriptions.exact +
                      serviceStats.subscriptions.patterns}
                  </span>
                </div>
                <div
                  className="text-sm text-muted-foreground"
                  title={`${serviceStats.cache.signals.toLocaleString()} signals across ${serviceStats.cache.buckets.toLocaleString()} buckets in ${serviceStats.cache.vehicles} vehicles · ${serviceStats.cache.bytes.toLocaleString()} bytes (approx)`}
                >
                  Cache:{" "}
                  <span className="font-medium text-foreground">
                    {formatBytes(serviceStats.cache.bytes)}
                  </span>{" "}
                  <span className="text-xs">
                    ({formatCount(serviceStats.cache.signals)} signals /{" "}
                    {formatCount(serviceStats.cache.buckets)} buckets /{" "}
                    {serviceStats.cache.window_sec}s)
                  </span>
                </div>
              </>
            )}

            <div className="ml-auto flex items-center gap-2">
              <label className="text-sm text-muted-foreground">
                Signal Subscription
              </label>
              <Input
                className={`h-9 w-56 font-mono text-xs ${
                  isSubDirty
                    ? "border-amber-500 focus-visible:ring-amber-500/30"
                    : ""
                }`}
                placeholder="*, motor_*, ecu_temp"
                title={`Currently subscribed: ${signalsApplied}`}
                value={signalsDraft}
                onChange={(e) => setSignalsDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitSignals();
                }}
              />
              <Button
                size="sm"
                variant={isSubDirty ? "default" : "outline"}
                disabled={!isSubDirty}
                onClick={commitSignals}
                className="h-9"
                title="Apply subscription (also: Enter)"
              >
                Apply
              </Button>
            </div>
          </div>
        </Card>

        <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
          <div
            className={`min-w-0 overflow-hidden transition-all duration-300 ease-in-out ${
              tableCollapsed
                ? "lg:shrink-0 lg:grow-0 lg:basis-12"
                : "lg:basis-0 lg:grow"
            }`}
          >
            {tableCollapsed ? (
              <CollapsedStripe
                label="Live Signals"
                icon={<TableIcon className="h-4 w-4 text-muted-foreground" />}
                expandDirection="right"
                onExpand={onExpandTable}
              />
            ) : (
              <DebugTable
                rows={rows}
                now={renderNow}
                sortKey={sortKey}
                sortDir={sortDir}
                graphedSet={graphedSet}
                search={search}
                onSort={onSort}
                onSelect={onSelect}
                onToggleGraph={onToggleGraph}
                onSearchChange={setSearch}
                onCollapse={onCollapseTable}
                emptyMessage={emptyMessage}
              />
            )}
          </div>

          <div
            className={`min-w-0 overflow-hidden transition-all duration-300 ease-in-out ${
              graphCollapsed
                ? "lg:shrink-0 lg:grow-0 lg:basis-12"
                : "lg:basis-0 lg:grow"
            }`}
          >
            {graphCollapsed ? (
              <CollapsedStripe
                label="Graph"
                icon={<LineChartIcon className="h-4 w-4 text-muted-foreground" />}
                expandDirection="left"
                onExpand={onExpandGraph}
              />
            ) : (
          <Card className="flex h-full flex-col gap-4 p-4">
            <div className="flex shrink-0 items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <LineChartIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Graph</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 rounded-md border p-0.5 text-xs">
                  {WINDOW_PRESETS_SEC.map((s) => (
                    <button
                      key={s}
                      onClick={() => setWindowSec(s)}
                      className={`rounded px-2 py-1 font-mono ${
                        windowSec === s
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s}s
                    </button>
                  ))}
                </div>
                <button
                  onClick={onCollapseGraph}
                  className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                  title="Collapse"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <GraphSignalPicker
              selected={graphed}
              available={availableSignals}
              onAdd={onToggleGraph}
              onRemove={onToggleGraph}
            />
            <div className="min-h-0 flex-1">
              <GraphCard
                selected={graphed}
                data={chartData}
                windowSec={windowSec}
              />
            </div>
          </Card>
            )}
          </div>
        </div>
      </div>

      <MessageTraceDialog
        signalId={selected?.signalId ?? null}
        vehicleType={vehicleType}
        highlightSignal={selected?.signalName}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </Layout>
  );
}

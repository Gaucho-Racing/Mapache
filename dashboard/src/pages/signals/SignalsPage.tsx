import Layout from "@/components/Layout";
import {
  ChartTypeToggle,
  type ChartType,
} from "@/components/signals/ChartTypeToggle";
import { QueryBuilder } from "@/components/signals/QueryBuilder";
import { QueryChart, type Series } from "@/components/signals/QueryChart";
import {
  defaultTimeframe,
  type Timeframe,
  TimeframePicker,
} from "@/components/signals/TimeframePicker";
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
import {
  DEFAULT_QUERY,
  type Query,
  type Rollup,
  serializeQuery,
} from "@/lib/query";
import { useVehicle } from "@/lib/store";
import { cn } from "@/lib/utils";
import axios from "axios";
import Fuse from "fuse.js";
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

// Same as `Rollup` — kept as a separate alias so future "interval" usage
// (e.g. backend response metadata typing) stays expressive.
type Interval = Rollup;

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

// Auto-pick a bucket width based on the selected range. Targets roughly
// 24–168 bars so the chart stays legible whether the user picks 15min or
// 1 week. Backend's INTERVALS dict caps us at 1m on the small end and 1d
// on the large end.
function autoInterval(rangeSeconds: number): Interval {
  if (rangeSeconds <= 60 * 60)          return "1m";   // ≤ 1h     → 60 bars
  if (rangeSeconds <= 4 * 60 * 60)      return "5m";   // ≤ 4h     → 48 bars
  if (rangeSeconds <= 24 * 60 * 60)     return "15m";  // ≤ 1d     → 96 bars
  if (rangeSeconds <= 3 * 24 * 60 * 60) return "1h";   // ≤ 3d     → 72 bars
  if (rangeSeconds <= 7 * 24 * 60 * 60) return "2h";   // ≤ 1w     → 84 bars
  return "1d";
}

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

function intervalToSeconds(i: Interval): number {
  switch (i) {
    case "1s":  return 1;
    case "10s": return 10;
    case "30s": return 30;
    case "1m":  return 60;
    case "5m":  return 5 * 60;
    case "15m": return 15 * 60;
    case "30m": return 30 * 60;
    case "1h":  return 60 * 60;
    case "2h":  return 2 * 60 * 60;
    case "6h":  return 6 * 60 * 60;
    case "1d":  return 24 * 60 * 60;
  }
}

function formatCount(n: number): string {
  if (n < 1_000) return n.toString();
  if (n < 1_000_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}

function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
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

  // Chart-side state: the structured query AST, the result series, the
  // chosen chart type, and a query-execution error surfaced under the
  // builder.
  const [queryAst, setQueryAst] = useState<Query>(DEFAULT_QUERY);
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [series, setSeries] = useState<Series[]>([]);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [seriesMs, setSeriesMs] = useState<number | null>(null);
  const [queryError, setQueryError] = useState<
    { message: string; position?: number } | null
  >(null);

  // Don't fire a request while a filter chip is still empty — the
  // serialized query (`... where name = ""`) is technically valid but
  // returns nothing useful, and it bombards the backend on every
  // chip-add. Skip until every filter has a value.
  const queryIsRunnable =
    queryAst.filters.every((f) => f.value.trim() !== "");

  const serializedQuery = useMemo(() => serializeQuery(queryAst), [queryAst]);

  const rangeSeconds = useMemo(
    () => (timeframe.end.getTime() - timeframe.start.getTime()) / 1000,
    [timeframe],
  );
  // Effective interval = explicit rollup on the AST if present, else
  // auto-picked from the timeframe width. The backend honors the same
  // precedence; we mirror it client-side so the bucket label in the
  // subtitle and the x-axis formatting are right *before* the response
  // arrives (avoids a one-render flicker on rollup changes).
  const interval = useMemo(
    () => queryAst.rollup ?? autoInterval(rangeSeconds),
    [queryAst.rollup, rangeSeconds],
  );

  // ISO strings drive the fetch effects; deriving via Date.getTime() means
  // we re-run the effect only when start/end actually move, not on every
  // Timeframe object identity change.
  const startIso = useMemo(() => timeframe.start.toISOString(), [timeframe]);
  const endIso = useMemo(() => timeframe.end.toISOString(), [timeframe]);

  // Brush-select callback for the chart. Always lands as "Custom" since
  // the user drew it themselves; presets re-snap to now when clicked.
  const onBrushSelect = (start: Date, end: Date) => {
    setTimeframe({ start, end, label: "Custom" });
  };

  // Two independent effects so the table doesn't refetch every time the
  // user iterates on the query or scrubs the timeframe.
  useEffect(() => {
    if (!vehicle.id) return;
    fetchSignals();
  }, [vehicle.id, vehicle.type]);

  useEffect(() => {
    if (!vehicle.id) return;
    if (!queryIsRunnable) return;
    runQuery();
    // Serialized form is the wire representation; depending on it (rather
    // than the AST object) means the effect only fires when the query
    // actually changes, not on every reference identity change.
  }, [vehicle.id, vehicle.type, rangeSeconds, serializedQuery, queryIsRunnable]);

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

  const runQuery = async () => {
    setLoadingSeries(true);
    // performance.now() is monotonic and sub-ms — accurate for short
    // requests where Date.now()'s 1ms quantization would round to 0.
    const startedAt = performance.now();
    try {
      const res = await axios.post(
        `${BACKEND_URL}/query/run`,
        {
          query: serializedQuery,
          vehicle_id: vehicle.id,
          start: startIso,
          end: endIso,
          interval,
        },
        { headers: authHeader() },
      );
      setSeries(res.data.data?.series ?? []);
      setSeriesMs(Math.round(performance.now() - startedAt));
      setQueryError(null);
    } catch (e) {
      // Parser errors come back 400 with {message, position}; surface them
      // under the query field and leave the previous series visible so the
      // user can compare iterations.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body: any = (e as any)?.response?.data?.data;
      if (body && typeof body.message === "string") {
        setQueryError({ message: body.message, position: body.position });
      } else {
        notify.error(getAxiosErrorMessage(e));
        setQueryError({ message: getAxiosErrorMessage(e) });
      }
      setSeriesMs(null);
    } finally {
      setLoadingSeries(false);
    }
  };

  const intervalSec = intervalToSeconds(interval);

  const totalSeriesValue = useMemo(() => {
    let acc = 0;
    for (const s of series) for (const p of s.points) acc += p.value ?? 0;
    return acc;
  }, [series]);

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
          <TimeframePicker value={timeframe} onChange={setTimeframe} />
        </div>

        <Card>
          <CardHeader className="gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <QueryBuilder
                  value={queryAst}
                  onChange={setQueryAst}
                  signalNames={signals.map((s) => s.name)}
                  error={queryError}
                />
              </div>
              <ChartTypeToggle value={chartType} onChange={setChartType} />
            </div>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {series.length > 1
                  ? `${series.length} series`
                  : "Query result"}
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                {loadingSeries
                  ? "Loading…"
                  : [
                      `${formatCount(totalSeriesValue)} total`,
                      `${interval} buckets`,
                      seriesMs !== null && formatLatency(seriesMs),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingSeries ? (
              <div className="flex h-[260px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <QueryChart
                series={series}
                type={chartType}
                intervalSec={intervalSec}
                onBrushSelect={onBrushSelect}
              />
            )}
          </CardContent>
        </Card>

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

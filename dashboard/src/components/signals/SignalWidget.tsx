import {
  ChartTypeSelect,
  type ChartType,
} from "@/components/signals/ChartTypeToggle";
import {
  CHART_TYPE_MAP,
  compatible,
  dataPath,
} from "@/components/signals/chartTypes";
import {
  PlotChart,
  isGpsLikePlot,
  type PlotConfig,
} from "@/components/signals/PlotChart";
import { pairsToSeries } from "@/lib/pairs";
import {
  QueryBuilder,
  type RejectStatsEntry,
} from "@/components/signals/QueryBuilder";
import {
  useRunSeries,
  usePairsData,
  useDerived,
} from "@/components/signals/useSignalData";
import {
  QueryChart,
  seriesColorMap,
  seriesLabel,
  type AxisSetting,
  type Series,
} from "@/components/signals/QueryChart";
import { buildSeriesVariables } from "@/lib/derived";
import {
  textToQueries,
  type QueryStmt,
} from "@/components/signals/MqlEditor";
import {
  axisSettingFor,
  TraceAxisControls,
} from "@/components/signals/TraceAxisControls";
import {
  Highlights,
  type Highlight,
} from "@/components/signals/Highlights";
import { ExportDialog } from "@/components/signals/ExportDialog";
import type { Lap } from "@/models/session";
import type { ECharts } from "echarts/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MAPBOX_ACCESS_TOKEN } from "@/consts/config";
import { formatMetric } from "@/lib/format";
import {
  DEFAULT_QUERY,
  type FillMode,
  looksLikeFetchQuery,
  parseQuery,
  type Query,
  type Rollup,
  serializeQuery,
  splitAssignment,
} from "@/lib/query";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import {
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  Hand,
  Loader2,
  Map as MapIcon,
  MoreVertical,
  MousePointer,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type Interval = Rollup;

// Auto-pick a bucket width targeting ~24–168 bars across the selected range.
function autoInterval(rangeSeconds: number): Interval {
  if (rangeSeconds <= 60 * 60)          return "1m";
  if (rangeSeconds <= 4 * 60 * 60)      return "5m";
  if (rangeSeconds <= 24 * 60 * 60)     return "15m";
  if (rangeSeconds <= 3 * 24 * 60 * 60) return "1h";
  if (rangeSeconds <= 7 * 24 * 60 * 60) return "2h";
  return "1d";
}

function intervalToSeconds(i: Interval): number {
  switch (i) {
    case "50ms":  return 0.05;
    case "100ms": return 0.1;
    case "500ms": return 0.5;
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

function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// Compact span like "2h 15m" / "45s" for the visible (zoomed) chart window.
function formatWindowDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return "—";
  const d = Math.floor(sec / 86_400);
  const h = Math.floor((sec % 86_400) / 3_600);
  const m = Math.floor((sec % 3_600) / 60);
  const s = Math.floor(sec % 60);
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s && !d && !h) parts.push(`${s}s`);
  return parts.slice(0, 2).join(" ") || "0s";
}

function clockLabel(ms: number): string {
  return new Date(ms).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// Stable-id generator for trace statements. Shares the `tr_` prefix with the
// ids MqlEditor mints, which stay collision-free.
let querySeq = 0;
function newQueryId(): string {
  querySeq += 1;
  return `tr_${querySeq}_${Date.now().toString(36)}`;
}

/** Compile a signal-name wildcard (`*` → any run) to an anchored regex,
 *  mirroring the backend LIKE semantics the filter picker already uses. */
function wildcardToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`, "i");
}

/** Concrete signal names a fetch query targets, expanding `*` wildcards against
 *  the known signal list. Only `name` filters matter (the pairs path plots by
 *  name, ignoring aggregator/field). */
function queryToSignalNames(q: Query, known: string[]): string[] {
  const out: string[] = [];
  for (const f of q.filters) {
    if (f.column !== "name") continue;
    const v = f.value.trim();
    if (v === "") continue;
    if (v.includes("*")) {
      const rx = wildcardToRegex(v);
      for (const n of known) if (rx.test(n)) out.push(n);
    } else {
      out.push(v);
    }
  }
  return out;
}

export interface SignalWidgetProps {
  vehicleId: string;
  /** Re-run the query when the vehicle type flips (different fleet/schema). */
  vehicleType: string;
  /** Signal names for builder autocomplete. */
  signalNames: string[];
  /** Shared page timeframe — every widget plots the same window. */
  startIso: string;
  endIso: string;
  rangeSeconds: number;
  /** Shared `echarts.connect` group id, so hover/tooltip sync across panels. */
  groupId: string;
  /** Collapse the chart body while keeping the query config. */
  hidden: boolean;
  onToggleHide: () => void;
  onDelete: () => void;
  /** Brush-select bubbles up to set the shared page timeframe. */
  onBrushSelect: (start: Date, end: Date) => void;
  /** Receives the ECharts instance (null on teardown) for group-wide dataZoom. */
  onChartReady?: (instance: ECharts | null) => void;
  /** Left-drag mode: "select" brushes a timeframe, "pan" slides the zoom. */
  interactionMode?: "select" | "pan";
  /** Set the shared left-drag mode from the chart's own toolbar. */
  onInteractionModeChange?: (mode: "select" | "pan") => void;
  /** Laps of the currently-selected session, enabling the `lap` highlight
   *  pseudo-variable + the "alternate by lap" shortcut. */
  laps?: Lap[] | null;
  /** Seed the initial query list — used when the widget is embedded in a
   *  saved dashboard so its persisted queries replace the default
   *  `count(signal.name)`. The local chip state still owns subsequent
   *  edits; the parent receives them via onQueriesChange. */
  seedQueries?: string[];
  /** Notify the parent every time the chip rows commit a change, so a
   *  dashboard widget can persist its config without polling. */
  onQueriesChange?: (queries: string[]) => void;
  /** Seed the initial chart type. Same write-once-then-controlled-locally
   *  contract as seedQueries — the toolbar inside still owns subsequent
   *  changes, the parent observes via onChartTypeChange. */
  seedChartType?: ChartType;
  onChartTypeChange?: (next: ChartType) => void;
  /** Rolling-window refresh interval in seconds. When set, the widget
   *  re-runs its query every N seconds so the chart's right edge keeps
   *  tracking `now`. Dashboards use this to blend live + historical
   *  data without (yet) holding a streaming subscription open. */
  refreshIntervalSec?: number;
}

export function SignalWidget({
  vehicleId,
  vehicleType,
  signalNames,
  startIso,
  endIso,
  rangeSeconds,
  groupId,
  hidden,
  onToggleHide,
  onDelete,
  onBrushSelect,
  onChartReady,
  interactionMode,
  onInteractionModeChange,
  laps,
  seedQueries,
  onQueriesChange,
  seedChartType,
  onChartTypeChange,
  refreshIntervalSec,
}: SignalWidgetProps) {
  // Ordered list of MQL trace statements, classified at render via
  // `looksLikeFetchQuery`: fetch statements hit /query/run; expression
  // statements evaluate in-browser over the fetched base series. The chip rows
  // and the raw MQL editor are two views of this one list.
  //
  // `seedQueries` lets a parent prefill the list at mount (dashboard
  // widget restoring saved MQL); subsequent edits stay local and the
  // parent observes via onQueriesChange. The seed is read-once on first
  // render — later parent changes won't yank the user's caret mid-edit.
  const [queries, setQueries] = useState<QueryStmt[]>(() =>
    seedQueries && seedQueries.length > 0
      ? seedQueries.map((mql) => ({ id: newQueryId(), mql }))
      : [{ id: newQueryId(), mql: "count(signal.name)" }],
  );
  // While a row's field is focused, freeze its kind: `looksLikeFetchQuery`
  // flips at the `(`, and re-classifying mid-type would swap the input element
  // and yank the caret. Re-classified on blur.
  const [editingRow, setEditingRow] = useState<{
    id: string;
    kind: "fetch" | "expr";
  } | null>(null);
  const [chartType, setChartType] = useState<ChartType>(seedChartType ?? "bar");

  // Bubble query/chart changes up to the parent (dashboard widget) so it
  // can persist them. Guarded against firing on the initial render.
  const initialQueriesRef = useRef(queries);
  useEffect(() => {
    if (!onQueriesChange) return;
    if (queries === initialQueriesRef.current) return;
    onQueriesChange(queries.map((q) => q.mql));
  }, [queries, onQueriesChange]);
  const initialChartTypeRef = useRef(chartType);
  useEffect(() => {
    if (!onChartTypeChange) return;
    if (chartType === initialChartTypeRef.current) return;
    onChartTypeChange(chartType);
  }, [chartType, onChartTypeChange]);
  // Per-trace y-scaling, keyed by series label. Sparse; absent = default.
  const [axisSettings, setAxisSettings] = useState<
    Record<string, AxisSetting>
  >({});
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Render path for the current chart type (see chartTypes.ts): "timeseries" →
  // QueryChart, "categorical" → PlotChart @ 1d, "pairs" → /query/pairs.
  const path = dataPath(chartType);

  // Reset the trace list to the target's default MQL when the current MQL can't
  // carry across (crossing into/out of the pairs path).
  const changeChartType = (next: ChartType) => {
    if (!compatible(chartType, next)) {
      setQueries(CHART_TYPE_MAP[next].defaultQueries());
    }
    setChartType(next);
  };

  // Classify each statement once per `queries` change so the editing UI and the
  // fetch effect read the same result. Fetch lines carry `-> name` inside the
  // grammar; expression lines split it off here (`body`/`name`).
  const classified = useMemo(
    () =>
      queries.map((t) => {
        if (looksLikeFetchQuery(t.mql)) {
          const res = parseQuery(t.mql);
          return res.ok
            ? ({ kind: "fetch" as const, stmt: t, query: res.query })
            : ({ kind: "fetch" as const, stmt: t, parseError: res.error });
        }
        const { body, name } = splitAssignment(t.mql);
        return { kind: "expr" as const, stmt: t, body, name };
      }),
    [queries],
  );

  // Runnable fetch statements: parse cleanly and have no empty filter value (an
  // empty chip is valid but useless and would bombard the backend).
  const fetchPlan = useMemo(() => {
    return classified
      .filter(
        (c): c is { kind: "fetch"; stmt: QueryStmt; query: Query } =>
          c.kind === "fetch" && "query" in c && c.query !== undefined,
      )
      .map((c) => ({
        id: c.stmt.id,
        query: c.query,
        mql: serializeQuery(c.query),
        runnable: c.query.filters.every((f) => f.value.trim() !== ""),
      }));
  }, [classified]);

  // JOIN INVARIANT: every fetch in a widget shares ONE interval, so every
  // fetched series lands on the SAME server-zero-filled bucket axis. Cross-series
  // math — both derived traces (`computeDerivedSeries`) and `-> name` links —
  // aligns operands purely BY BUCKET INDEX (points[i] ↔ points[i]); there is no
  // timestamp join. That alignment is only sound because of this one-interval
  // contract, so it is enforced here for the whole widget. Any future
  // link-by-name feature (frontend or server-side) builds on exactly this: a
  // single shared bucket axis is the join key. Take the first statement's
  // `.every`, else the auto interval. Categorical collapses to one 1d bucket.
  const interval = useMemo<Interval>(() => {
    if (path === "categorical") return "1d";
    for (const p of fetchPlan) if (p.query.rollup) return p.query.rollup;
    return autoInterval(rangeSeconds);
  }, [path, fetchPlan, rangeSeconds]);

  const intervalSec = intervalToSeconds(interval);

  const runnableFetches = useMemo(
    () => fetchPlan.filter((p) => p.runnable),
    [fetchPlan],
  );
  // Rolling-window refresh: when `refreshIntervalSec` is set, bump a
  // tick every N seconds. The tick gets folded into `fetchKey`, which
  // is what the historical query effect watches — so the chart re-runs
  // the query, picking up rows added since the last fetch. This is the
  // poor-person's live blend; PR-N will swap in an SSE-driven hook for
  // sub-second updates.
  const [refreshTick, setRefreshTick] = useState(0);
  useEffect(() => {
    if (!refreshIntervalSec || refreshIntervalSec <= 0) return;
    const t = setInterval(
      () => setRefreshTick((n) => n + 1),
      refreshIntervalSec * 1000,
    );
    return () => clearInterval(t);
  }, [refreshIntervalSec]);

  // Stable key over the wire form, so the fetch effect fires only on real change.
  const fetchKey = useMemo(
    () =>
      JSON.stringify({
        ids: runnableFetches.map((p) => `${p.id}:${p.mql}`),
        interval,
        // Rolling-window tick: only contributes to the key when the
        // parent opted in to refresh, otherwise stays a constant 0.
        tick: refreshIntervalSec ? refreshTick : 0,
      }),
    [runnableFetches, interval, refreshIntervalSec, refreshTick],
  );
  // Debounce so editing the MQL line doesn't fire /query/run per keystroke
  // (each response forces a synchronous re-render that drops typing). Timeframe/
  // vehicle/path deps stay un-debounced so those refetch immediately.
  const debouncedFetchKey = useDebouncedValue(fetchKey, 350);

  const { fetchResults, loadingSeries, setLoadingSeries } = useRunSeries({
    vehicleId,
    vehicleType,
    startIso,
    endIso,
    rangeSeconds,
    interval,
    path,
    runnableFetches,
    debouncedFetchKey,
  });

  // Pairs path: each trace resolves to ONE signal (first `.where` name), and
  // trace position assigns the axis (line 1 → X, 2 → Y, 3 → Z).
  const pairNames = useMemo(() => {
    const out: string[] = [];
    for (const p of runnableFetches) {
      const n = queryToSignalNames(p.query, signalNames)[0];
      if (n) out.push(n);
    }
    return out;
  }, [runnableFetches, signalNames]);

  // Enough axes resolved to plot: 2 for scatter/path, 3 for 3D.
  const pairReady =
    path === "pairs" &&
    (chartType === "scatter3d" ? pairNames.length >= 3 : pairNames.length >= 2);

  // Axis signals, deduped.
  const pairFetchSignals = useMemo(() => {
    if (path !== "pairs") return [];
    return [...new Set(pairNames)];
  }, [path, pairNames]);

  // Debounce the pairs refetch too — axis signals come from live-edited lines.
  const debouncedPairKey = useDebouncedValue(pairFetchSignals.join(","), 350);

  const { pairsData } = usePairsData({
    vehicleId,
    vehicleType,
    startIso,
    endIso,
    path,
    pairReady,
    pairFetchSignals,
    debouncedPairKey,
    setLoadingSeries,
  });

  // PlotConfig assembled from the resolved axis signals (by trace position).
  const plotConfig = useMemo<PlotConfig>(() => {
    const x = pairNames[0];
    if (chartType === "scatter3d") {
      return {
        kind: "scatter3d",
        xSignal: x,
        ySignals: pairNames[1] ? [pairNames[1]] : [],
        zSignal: pairNames[2],
      };
    }
    if (chartType === "path") {
      return {
        kind: "path",
        xSignal: x,
        ySignals: pairNames[1] ? [pairNames[1]] : [],
      };
    }
    if (chartType === "scatter") {
      return {
        kind: "scatter",
        xSignal: x,
        ySignals: pairNames.slice(1),
      };
    }
    // categorical: axes unused, data comes from runSeries.
    return { kind: chartType === "pie" ? "pie" : "catbar", ySignals: [] };
  }, [chartType, pairNames]);

  // Every fetched series concatenated in trace order. Derived expressions read
  // s0, s1, … from here by position.
  const runSeries = useMemo(() => {
    const byId = new Map(fetchResults.map((r) => [r.id, r]));
    const out: Series[] = [];
    for (const p of runnableFetches) {
      const r = byId.get(p.id);
      if (r) out.push(...r.series);
    }
    return out;
  }, [fetchResults, runnableFetches]);

  const baseSeries = runSeries;

  // Per-statement run/parse errors keyed by statement id, for inline display.
  const fetchErrors = useMemo(() => {
    const out: Record<string, { message: string; position?: number }> = {};
    for (const c of classified) {
      if (c.kind === "fetch" && "parseError" in c && c.parseError) {
        out[c.stmt.id] = c.parseError;
      }
    }
    for (const r of fetchResults) if (r.error) out[r.id] = r.error;
    return out;
  }, [classified, fetchResults]);

  // Per-statement cut-summaries keyed by statement id, for the reject chip.
  const rejectStatsById = useMemo(() => {
    const out: Record<string, RejectStatsEntry[] | null> = {};
    for (const r of fetchResults) if (r.rejectStats) out[r.id] = r.rejectStats;
    return out;
  }, [fetchResults]);

  // Subtitle latency: sum across every fetch statement.
  const seriesMs = useMemo(() => {
    const vals = fetchResults
      .map((r) => r.ms)
      .filter((m): m is number => m !== null);
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0);
  }, [fetchResults]);

  // Expression statements mapped to the evaluator's DerivedTrace shape. A
  // `-> name` sets the label and registers a referenceable variable; unnamed
  // expressions fall back to their text.
  const exprTraces = useMemo(
    () =>
      classified
        .filter((c) => c.kind === "expr")
        .map((c) => ({
          id: c.stmt.id,
          name: c.name,
          label: c.name ?? c.body.trim(),
          expression: c.body,
        })),
    [classified],
  );

  // Evaluate expressions in order (each named result feeds a later one) and
  // resolve highlight bands, both over the shared base-series bucket axis.
  const { derivedResults, highlightRanges, highlightErrors } = useDerived(
    baseSeries,
    exprTraces,
    highlights,
    laps,
  );

  // Named derived series are referenceable variables — carry each one's explicit
  // `-> name` so the hint and validation use it as a first-class alias (matching
  // the pool `computeDerivedSeries` builds), not the label-derived heuristic.
  const namedDerivedSeries = useMemo(() => {
    const nameById = new Map(
      exprTraces.filter((t) => t.name).map((t) => [t.id, t.name as string]),
    );
    return derivedResults
      .filter((r) => nameById.has(r.id) && r.series)
      .map((r) => ({ series: r.series as Series, name: nameById.get(r.id) }));
  }, [exprTraces, derivedResults]);

  // Variable hint (s0 = current_ac, s1 = ratio, …) shown near the rows.
  const seriesVariables = useMemo(
    () =>
      buildSeriesVariables([
        ...baseSeries.map((s) => ({ series: s })),
        ...namedDerivedSeries,
      ]),
    [baseSeries, namedDerivedSeries],
  );

  const derivedSeries = useMemo(
    () =>
      derivedResults
        .map((r) => r.series)
        .filter((s): s is Series => s !== undefined),
    [derivedResults],
  );

  // Expression errors keyed by statement id, merged with fetch errors below.
  const exprErrors = useMemo(() => {
    const out: Record<string, string> = {};
    for (const r of derivedResults) if (r.error) out[r.id] = r.error;
    return out;
  }, [derivedResults]);

  const plottedSeries = useMemo(
    () => [...baseSeries, ...derivedSeries],
    [baseSeries, derivedSeries],
  );

  // What reaches the chart: drop any hidden trace.
  const visibleSeries = useMemo(
    () =>
      plottedSeries.filter(
        (s) => !axisSettingFor(axisSettings, seriesLabel(s.tags)).hidden,
      ),
    [plottedSeries, axisSettings],
  );

  // Narrow the (possibly stale) settings map to just the plotted labels.
  const axisConfig = useMemo(() => {
    const out: Record<string, AxisSetting> = {};
    for (const s of visibleSeries) {
      const label = seriesLabel(s.tags);
      if (axisSettings[label]) out[label] = axisSettings[label];
    }
    return out;
  }, [visibleSeries, axisSettings]);

  // Each fetch statement's `.fill` mode applies to every series it produces.
  const fillConfig = useMemo(() => {
    const out: Record<string, FillMode> = {};
    const fillById = new Map<string, FillMode>();
    for (const p of runnableFetches) {
      if (p.query.fill) fillById.set(p.id, p.query.fill);
    }
    for (const r of fetchResults) {
      const fill = fillById.get(r.id);
      if (!fill) continue;
      for (const s of r.series) out[seriesLabel(s.tags)] = fill;
    }
    return out;
  }, [runnableFetches, fetchResults]);

  // label → rendered line color, mirroring the chart's top-K reordering.
  const seriesColors = useMemo(
    () => seriesColorMap(visibleSeries),
    [visibleSeries],
  );

  // Badge count so collapsing the disclosure never hides active state.
  const advancedCount = useMemo(() => {
    const bands = highlights.filter((h) => h.expression.trim() !== "").length;
    let axes = 0;
    for (const s of plottedSeries) {
      const st = axisSettings[seriesLabel(s.tags)];
      if (st && (st.normalize || st.hidden || st.axisGroup !== "1")) axes++;
    }
    return bands + axes;
  }, [highlights, axisSettings, plottedSeries]);

  const updateAxisSetting = (label: string, patch: Partial<AxisSetting>) =>
    setAxisSettings((prev) => ({
      ...prev,
      [label]: { ...axisSettingFor(prev, label), ...patch },
    }));

  const updateQueryMql = (id: string, mql: string) =>
    setQueries((prev) => prev.map((t) => (t.id === id ? { ...t, mql } : t)));

  const addQuery = () =>
    setQueries((prev) => [...prev, { id: newQueryId(), mql: "avg(signal.value)" }]);

  const removeQuery = (id: string) =>
    setQueries((prev) =>
      // Never drop the last row.
      prev.length <= 1 ? prev : prev.filter((t) => t.id !== id),
    );

  // Last successfully-parsed query per fetch row, so a transiently-unparseable
  // edit doesn't unmount the chip builder and steal focus.
  const lastGoodQuery = useRef<Map<string, Query>>(new Map());

  const chartInstance = useRef<ECharts | null>(null);
  // Visible-window zoom as [start, end] percentages of the fetched range,
  // tracked off the chart's inside-dataZoom so the header can show the span.
  const [zoomPct, setZoomPct] = useState<{ start: number; end: number }>({
    start: 0,
    end: 100,
  });
  const handleChartReady = (instance: ECharts | null) => {
    chartInstance.current = instance;
    // Only the time-series chart joins the shared connect group.
    onChartReady?.(instance);
    if (instance) {
      const readZoom = () => {
        const opt = instance.getOption() as
          | { dataZoom?: { start?: number; end?: number }[] }
          | undefined;
        const dz = opt?.dataZoom?.[0];
        setZoomPct({ start: dz?.start ?? 0, end: dz?.end ?? 100 });
      };
      instance.on("datazoom", readZoom);
      readZoom();
    } else {
      setZoomPct({ start: 0, end: 100 });
    }
  };
  const handlePlotReady = (instance: ECharts | null) => {
    chartInstance.current = instance;
  };

  // Categorical reuses the /query/run series; PlotChart sums each to its total.
  const categoricalSeries = path === "categorical" ? runSeries : [];

  const hasData =
    path === "timeseries"
      ? visibleSeries.length > 0
      : path === "pairs"
        ? pairsData.rows.length > 0
        : categoricalSeries.length > 0;

  // Export data adapted to the Series shape the CSV/JSON serializers expect.
  const exportVisible =
    path === "pairs"
      ? pairsToSeries(pairsData)
      : path === "categorical"
        ? categoricalSeries
        : visibleSeries;
  const exportAll =
    path === "pairs"
      ? pairsToSeries(pairsData)
      : path === "categorical"
        ? categoricalSeries
        : plottedSeries;

  const [exportOpen, setExportOpen] = useState(false);
  const [mapEnabled, setMapEnabled] = useState(false);

  // A GPS-like scatter/path can show an opt-in Mapbox basemap; the toggle is
  // hidden otherwise and when no token is configured.
  const canShowMap = !!MAPBOX_ACCESS_TOKEN && isGpsLikePlot(plotConfig);

  const totalSeriesValue = useMemo(() => {
    let acc = 0;
    for (const s of baseSeries) for (const p of s.points) acc += p.value ?? 0;
    return acc;
  }, [baseSeries]);

  // Pairs path: label each fetch row by the axis its position maps to.
  const pairAxisLabels = useMemo(() => {
    const out: Record<string, string> = {};
    if (path !== "pairs") return out;
    let i = 0;
    for (const c of classified) {
      if (c.kind !== "fetch") continue;
      out[c.stmt.id] =
        i === 0
          ? "X"
          : chartType === "scatter3d"
            ? i === 1
              ? "Y"
              : i === 2
                ? "Z"
                : `#${i + 1}`
            : "Y";
      i++;
    }
    return out;
  }, [path, classified, chartType]);

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-1 flex-col gap-3">
            {/* Trace list — one row per statement. Each chip row carries
                its own inline-editable MQL line, so power users can drop
                to text without a global mode toggle. */}
            <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-3">
                  {classified.map((c) => {
                    const id = c.stmt.id;
                    const onlyRow = queries.length <= 1;
                    // Honor a frozen kind while this row is being typed in, so
                    // crossing the `(` boundary doesn't swap the input element.
                    const kind =
                      editingRow?.id === id ? editingRow.kind : c.kind;
                    if (kind === "fetch") {
                      // Chip builder for any fetch-looking line (even
                      // transiently-unparseable ones), falling back to the
                      // last-good query so the builder never unmounts mid-edit.
                      const parsed = "query" in c ? c.query : undefined;
                      if (parsed) lastGoodQuery.current.set(id, parsed);
                      const builderValue =
                        parsed ?? lastGoodQuery.current.get(id) ?? DEFAULT_QUERY;
                      return (
                        <QueryRow key={id} onRemove={() => removeQuery(id)} disableRemove={onlyRow} axisLabel={pairAxisLabels[id]}>
                          <QueryBuilder
                            value={builderValue}
                            onChange={(next) => updateQueryMql(id, serializeQuery(next))}
                            onMqlChange={(mql) => updateQueryMql(id, mql)}
                            onMqlFocus={() => setEditingRow({ id, kind: "fetch" })}
                            onMqlBlur={() => setEditingRow(null)}
                            signalNames={signalNames}
                            error={fetchErrors[id] ?? null}
                            rejectStats={rejectStatsById[id] ?? null}
                          />
                        </QueryRow>
                      );
                    }
                    // Expression row → raw input.
                    const errMessage = exprErrors[id];
                    return (
                      <QueryRow key={id} onRemove={() => removeQuery(id)} disableRemove={onlyRow}>
                        <div className="flex flex-col gap-1">
                          <input
                            value={c.stmt.mql}
                            onChange={(e) => updateQueryMql(id, e.target.value)}
                            onFocus={() => setEditingRow({ id, kind: "expr" })}
                            onBlur={() => setEditingRow(null)}
                            spellCheck={false}
                            placeholder="expression (e.g. ecu / other -> ratio) or fetch query"
                            className={cn(
                              "h-8 w-full rounded-md border bg-background px-2.5 font-mono text-xs outline-none focus:border-primary/40",
                              errMessage && "border-destructive/50",
                            )}
                          />
                          {errMessage ? (
                            <p className="pl-1 text-xs text-destructive">
                              {errMessage}
                            </p>
                          ) : null}
                        </div>
                      </QueryRow>
                    );
                  })}

                  {/* Variable hint for expression rows: s0 = current_ac, … */}
                  {seriesVariables.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground/70">
                      <span className="uppercase tracking-wider">vars</span>
                      {seriesVariables.map((v) => {
                        const alias = v.name ?? v.friendly;
                        return (
                          <code key={v.index} className="font-mono">
                            {alias ? `${v.index} = ${alias}` : v.index}
                          </code>
                        );
                      })}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={addQuery}
                    className="inline-flex h-7 w-fit items-center gap-1 rounded-md border border-dashed bg-transparent px-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent/40 hover:text-foreground"
                  >
                    <Plus className="h-3 w-3" />
                    Add query
                  </button>
                </div>
            </div>

            {/* Advanced options: per-trace y-axis scaling + visibility,
                highlight bands. Time-series only (shared bucket axis). */}
            {path === "timeseries" && (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setAdvancedOpen((o) => !o)}
                className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {advancedOpen ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
                Advanced render options
                {advancedCount > 0 && (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/15 px-1 text-[10px] font-semibold text-primary">
                    {advancedCount}
                  </span>
                )}
              </button>
              {advancedOpen && (
                <div className="flex flex-col gap-3">
                  <TraceAxisControls
                    series={plottedSeries}
                    colors={seriesColors}
                    settings={axisSettings}
                    onChange={updateAxisSetting}
                  />
                  <Highlights
                    highlights={highlights}
                    onChange={setHighlights}
                    variables={seriesVariables}
                    errors={highlightErrors}
                    lapsAvailable={!!laps?.length}
                  />
                </div>
              )}
            </div>
            )}
          </div>
          {/* Widget-level operations collapse into a single kebab so the
              header reads as "title, menu" rather than an icon parade.
              Chart-type lives next to the chart canvas now (it's a
              chart-content choice, not a widget operation). */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title="Widget actions"
                className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {hasData && (
                <DropdownMenuItem onClick={() => setExportOpen(true)}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </DropdownMenuItem>
              )}
              {canShowMap && (
                <DropdownMenuItem onClick={() => setMapEnabled((v) => !v)}>
                  <MapIcon className="mr-2 h-4 w-4" />
                  {mapEnabled ? "Hide map" : "Show map"}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onToggleHide}>
                {hidden ? (
                  <EyeOff className="mr-2 h-4 w-4" />
                ) : (
                  <Eye className="mr-2 h-4 w-4" />
                )}
                {hidden ? "Show chart" : "Hide chart"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete widget
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {!hidden && (
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {path === "pairs"
                ? CHART_TYPE_MAP[chartType].label
                : path === "categorical"
                  ? "Categorical aggregate"
                  : baseSeries.length > 1
                    ? `${baseSeries.length} series`
                    : "Query result"}
            </CardTitle>
            {path === "timeseries" && (
              <div className="text-sm text-muted-foreground">
                {loadingSeries
                  ? "Loading…"
                  : [
                      `${formatMetric(totalSeriesValue)} total`,
                      `${interval} buckets`,
                      seriesMs !== null && formatLatency(seriesMs),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
              </div>
            )}
          </div>
        )}
      </CardHeader>
      {!hidden && (
        <CardContent>
          {/* Chart-type lives here (not in the widget header) — it picks
              what the chart canvas renders, so it belongs with the
              chart-content controls. */}
          <div className="mb-3 flex items-center">
            <ChartTypeSelect value={chartType} onChange={changeChartType} />
          </div>
          {path === "timeseries" && onInteractionModeChange && (
            // Left-drag mode sits just above the chart so it's a short hop to
            // the gesture; "select" brushes a timeframe, "pan" slides the zoom.
            // The left side surfaces the visible (zoomed) window span.
            <div className="mb-3 flex items-center justify-between gap-2">
              {(() => {
                const startMs = new Date(startIso).getTime();
                const endMs = new Date(endIso).getTime();
                const span = endMs - startMs;
                const fromMs = startMs + (zoomPct.start / 100) * span;
                const toMs = startMs + (zoomPct.end / 100) * span;
                return (
                  <div className="flex items-baseline gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {formatWindowDuration((toMs - fromMs) / 1000)}
                    </span>
                    <span className="font-mono">
                      {clockLabel(fromMs)} – {clockLabel(toMs)}
                    </span>
                  </div>
                );
              })()}
              <div className="flex items-center rounded-md border">
                <Button
                  variant={interactionMode === "pan" ? "ghost" : "secondary"}
                  size="sm"
                  className="rounded-r-none border-0"
                  onClick={() => onInteractionModeChange("select")}
                  title="Select: drag to set the timeframe"
                >
                  <MousePointer className="mr-2 h-4 w-4" />
                  Select
                </Button>
                <Button
                  variant={interactionMode === "pan" ? "secondary" : "ghost"}
                  size="sm"
                  className="rounded-l-none border-0"
                  onClick={() => onInteractionModeChange("pan")}
                  title="Pan: drag to slide the zoom window"
                >
                  <Hand className="mr-2 h-4 w-4" />
                  Pan
                </Button>
              </div>
            </div>
          )}
          {loadingSeries ? (
            <div className="flex h-[260px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : path !== "timeseries" ? (
            !hasData ? (
              <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                {path === "pairs"
                  ? "Set the axis signals (one per query line) to plot"
                  : "No data in this window"}
              </div>
            ) : (
              <PlotChart
                config={plotConfig}
                pairs={pairsData}
                categorical={categoricalSeries}
                mapEnabled={mapEnabled && canShowMap}
                onReady={handlePlotReady}
              />
            )
          ) : (
            <QueryChart
              series={visibleSeries}
              type={chartType as "bar" | "line" | "area"}
              intervalSec={intervalSec}
              groupId={groupId}
              onBrushSelect={onBrushSelect}
              onReady={handleChartReady}
              axisConfig={axisConfig}
              fillConfig={fillConfig}
              highlights={highlightRanges}
              interactionMode={interactionMode}
            />
          )}
        </CardContent>
      )}
      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        getInstance={() => chartInstance.current}
        visibleSeries={exportVisible}
        allSeries={exportAll}
        chartHidden={hidden}
        defaultFilename="signals"
      />
    </Card>
  );
}

/** One trace-list row: its editing surface plus a remove button (disabled when
 *  it's the only row). */
function QueryRow({
  children,
  onRemove,
  disableRemove,
  axisLabel,
}: {
  children: React.ReactNode;
  onRemove: () => void;
  disableRemove: boolean;
  /** Pairs path: the axis (X/Y/Z) this row's signal maps to, by position. */
  axisLabel?: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-md border bg-card/40 p-2.5">
      {axisLabel ? (
        <span className="mt-1.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/15 text-[10px] font-semibold text-primary">
          {axisLabel}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">{children}</div>
      <button
        type="button"
        onClick={onRemove}
        disabled={disableRemove}
        aria-label="Remove query"
        title={disableRemove ? "A widget needs at least one query" : "Remove query"}
        className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// Re-exported so the page/tests can build a trace list from text.
export { textToQueries };

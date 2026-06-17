import {
  ChartTypeSelect,
  type ChartType,
} from "@/components/signals/ChartTypeToggle";
import {
  CHART_TYPE_MAP,
  compatible,
  dataPath,
} from "@/components/signals/chartTypes";
import { PlotChart, type PlotConfig } from "@/components/signals/PlotChart";
import { fetchPairs, pairsToSeries, type PairsResponse } from "@/lib/pairs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QueryBuilder } from "@/components/signals/QueryBuilder";
import {
  QueryChart,
  seriesColorMap,
  seriesLabel,
  type AxisSetting,
  type Series,
} from "@/components/signals/QueryChart";
import {
  buildSeriesVariables,
  computeDerivedSeries,
} from "@/components/signals/DerivedTraces";
import {
  MqlEditor,
  textToTraces,
  type TraceStmt,
} from "@/components/signals/MqlEditor";
import {
  axisSettingFor,
  TraceAxisControls,
} from "@/components/signals/TraceAxisControls";
import {
  evaluateHighlights,
  Highlights,
  type Highlight,
} from "@/components/signals/Highlights";
import { ExportDialog } from "@/components/signals/ExportDialog";
import type { ECharts } from "echarts/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BACKEND_URL } from "@/consts/config";
import { getAxiosErrorMessage } from "@/lib/axios-error-handler";
import { notify } from "@/lib/notify";
import {
  DEFAULT_QUERY,
  type FillMode,
  looksLikeFetchQuery,
  parseQuery,
  type Query,
  type Rollup,
  serializeQuery,
} from "@/lib/query";
import { cn } from "@/lib/utils";
import axios from "axios";
import {
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

// Same as `Rollup` — kept as a separate alias so future "interval" usage
// (e.g. backend response metadata typing) stays expressive.
type Interval = Rollup;

function authHeader() {
  return {
    Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
  };
}

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

function formatCount(n: number): string {
  if (n < 1_000) return n.toString();
  if (n < 1_000_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}

function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// Stable-id generator for trace statements created by this widget (the seed
// trace + "+ Add trace"). The MqlEditor mints its own ids on the text path;
// both share the `tr_` prefix shape so nothing collides.
let traceSeq = 0;
function newTraceId(): string {
  traceSeq += 1;
  return `tr_${traceSeq}_${Date.now().toString(36)}`;
}

/** Compile a signal-name wildcard (`*` → any run) to an anchored regex,
 *  mirroring the backend LIKE semantics the filter picker already uses. */
function wildcardToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`, "i");
}

/** Concrete signal names a fetch query targets, expanding `*` wildcards
 *  against the page's known signal list. The pairs path plots raw signals by
 *  name, so the aggregator/field are irrelevant — only the `name` filters
 *  matter. */
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

/** One trace statement as the widget understands it — fetch or expression is
 *  decided at render via `looksLikeFetchQuery`, not stored. */
type FetchResult = {
  /** The owning statement id (for inline error placement). */
  id: string;
  series: Series[];
  /** Per-statement parse/run error in the backend's {message, position} shape. */
  error?: { message: string; position?: number };
  ms: number | null;
};

export interface SignalWidgetProps {
  /** Page-level vehicle scope. */
  vehicleId: string;
  /** Re-run the query when the vehicle type flips (different fleet/schema). */
  vehicleType: string;
  /** Signal names for builder autocomplete. */
  signalNames: string[];
  /** Shared page timeframe — every widget plots the same window. */
  startIso: string;
  endIso: string;
  rangeSeconds: number;
  /** ECharts connection group — all widgets pass the same id so the hover
   *  cursor + tooltip sync across panels. */
  groupId: string;
  /** Collapse the chart body while keeping the query config. */
  hidden: boolean;
  onToggleHide: () => void;
  /** Remove this widget from the page. */
  onDelete: () => void;
  /** Brush-select on this widget's chart bubbles up to set the shared
   *  page timeframe. */
  onBrushSelect: (start: Date, end: Date) => void;
  /** Receives this widget's ECharts instance on ready (and `null` on
   *  teardown) so the page can dispatch group-wide dataZoom (zoom out /
   *  reset) through any live panel. */
  onChartReady?: (instance: ECharts | null) => void;
  /** Left-drag gesture mode for the chart, owned by the page toggle:
   *  "select" brushes a timeframe, "pan" slides the zoom window. Forwarded
   *  straight to QueryChart. */
  interactionMode?: "select" | "pan";
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
}: SignalWidgetProps) {
  // The widget owns an ordered LIST of MQL trace statements. Each is classified
  // at render via `looksLikeFetchQuery`: fetch statements hit /query/run;
  // expression statements (`s0 / s1`, `current_ac^2`) evaluate in-browser over
  // the fetched base series. The chip rows and the raw MQL editor are two views
  // of THIS one list.
  const [traces, setTraces] = useState<TraceStmt[]>([
    { id: newTraceId(), mql: "count(signal)" },
  ]);
  // Swap the whole trace list to a single textarea (one statement per line).
  const [editAsMql, setEditAsMql] = useState(false);
  const [chartType, setChartType] = useState<ChartType>("bar");
  // Fetched base series, one entry per fetch statement (in trace order),
  // concatenated below into `baseSeries`.
  const [fetchResults, setFetchResults] = useState<FetchResult[]>([]);
  // Per-trace y-scaling settings (T8), keyed by series label. Sparse: any
  // label absent here uses the default (shared group "1", un-normalized).
  const [axisSettings, setAxisSettings] = useState<
    Record<string, AxisSetting>
  >({});
  // Per-widget highlight conditions (T6), evaluated in-browser.
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  // Advanced options disclosure (T10): y-axis scaling + visibility, highlights.
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [loadingSeries, setLoadingSeries] = useState(false);

  // The render path the current chart type drives (see chartTypes.ts):
  //  - "timeseries"  → /query/run, rendered by QueryChart (bar/line/area)
  //  - "categorical" → /query/run @ 1d buckets, rendered by PlotChart (catbar/pie)
  //  - "pairs"       → /query/pairs, rendered by PlotChart (scatter/path/3D)
  const path = dataPath(chartType);
  // Raw aligned samples for the pairs path (scatter/path/3D).
  const [pairsData, setPairsData] = useState<PairsResponse>({
    columns: ["produced_at"],
    rows: [],
  });
  // Color-by dimension for scatter/path (render option, not MQL): "none",
  // "time", or a signal name.
  const [colorBy, setColorBy] = useState<string>("none");

  // Switch chart type, resetting the trace list to the target's default MQL when
  // the current MQL can't carry across (crossing into/out of the pairs path).
  const changeChartType = (next: ChartType) => {
    if (!compatible(chartType, next)) {
      setTraces(CHART_TYPE_MAP[next].defaultTraces());
    }
    setChartType(next);
  };

  // --- Classify each statement once per `traces` change ---------------------
  // A fetch statement carries its parsed Query (or a parse error); an
  // expression statement is just its text. Done here so both the editing UI
  // and the fetch effect read the same classification.
  const classified = useMemo(
    () =>
      traces.map((t) => {
        if (looksLikeFetchQuery(t.mql)) {
          const res = parseQuery(t.mql);
          return res.ok
            ? ({ kind: "fetch" as const, stmt: t, query: res.query })
            : ({ kind: "fetch" as const, stmt: t, parseError: res.error });
        }
        return { kind: "expr" as const, stmt: t };
      }),
    [traces],
  );

  // The fetch statements that are actually runnable: parse cleanly AND don't
  // have an empty filter chip value (the old "don't fire on empty chip" guard,
  // now per statement). The serialized form drives the fetch effect's deps.
  const fetchPlan = useMemo(() => {
    return classified
      .filter(
        (c): c is { kind: "fetch"; stmt: TraceStmt; query: Query } =>
          c.kind === "fetch" && "query" in c && c.query !== undefined,
      )
      .map((c) => ({
        id: c.stmt.id,
        query: c.query,
        mql: serializeQuery(c.query),
        // Skip until every filter has a value — a `... where name = ""` query
        // is valid but useless and bombards the backend on every chip-add.
        runnable: c.query.filters.every((f) => f.value.trim() !== ""),
      }));
  }, [classified]);

  // Effective shared interval (INVARIANT): all fetch statements in a widget are
  // requested with ONE interval so they share the chart's single bucket axis
  // (computeDerivedSeries relies on every base series sharing the same bucket
  // array). We take the rollup of the FIRST fetch statement that sets one, else
  // the auto interval from the timeframe. A per-statement `.every()` still
  // parses, but only this first-set one drives the shared axis.
  const interval = useMemo<Interval>(() => {
    // Categorical (catbar/pie) collapses the whole window into one bucket per
    // group, so each series' total is its bar/slice value.
    if (path === "categorical") return "1d";
    for (const p of fetchPlan) if (p.query.rollup) return p.query.rollup;
    return autoInterval(rangeSeconds);
  }, [path, fetchPlan, rangeSeconds]);

  const intervalSec = intervalToSeconds(interval);

  // A stable key over the runnable fetch statements + the shared interval, so
  // the fetch effect fires only when the wire form actually changes.
  const runnableFetches = useMemo(
    () => fetchPlan.filter((p) => p.runnable),
    [fetchPlan],
  );
  const fetchKey = useMemo(
    () =>
      JSON.stringify({
        ids: runnableFetches.map((p) => `${p.id}:${p.mql}`),
        interval,
      }),
    [runnableFetches, interval],
  );

  // Run every runnable fetch statement in parallel against /query/run with the
  // SAME shared interval, and collect per-statement series/errors. The
  // concatenation order is preserved by mapping over `runnableFetches`.
  const runFetches = async () => {
    setLoadingSeries(true);
    try {
      const results = await Promise.all(
        runnableFetches.map(async (p): Promise<FetchResult> => {
          const startedAt = performance.now();
          try {
            const res = await axios.post(
              `${BACKEND_URL}/query/run`,
              {
                query: p.mql,
                vehicle_id: vehicleId,
                start: startIso,
                end: endIso,
                interval,
              },
              { headers: authHeader() },
            );
            return {
              id: p.id,
              series: res.data.data?.series ?? [],
              ms: Math.round(performance.now() - startedAt),
            };
          } catch (e) {
            // Parser errors come back 400 with {message, position}; surface
            // them inline under the offending statement and keep the rest.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const body: any = (e as any)?.response?.data?.data;
            const error =
              body && typeof body.message === "string"
                ? { message: body.message, position: body.position }
                : { message: getAxiosErrorMessage(e) };
            if (!body || typeof body.message !== "string") {
              notify.error(getAxiosErrorMessage(e));
            }
            return { id: p.id, series: [], error, ms: null };
          }
        }),
      );
      setFetchResults(results);
    } finally {
      setLoadingSeries(false);
    }
  };

  useEffect(() => {
    if (!vehicleId) return;
    // The pairs path fetches /query/pairs (separate effect); skip the aggregate
    // /query/run path there so we don't double-fetch. Categorical still runs
    // here (at 1d buckets).
    if (path === "pairs") return;
    if (runnableFetches.length === 0) {
      setFetchResults([]);
      return;
    }
    runFetches();
    // `fetchKey` is the wire form of every runnable fetch statement + the
    // shared interval; depending on it means the effect fires only on real
    // changes, not on reference identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId, vehicleType, rangeSeconds, fetchKey, startIso, endIso, path]);

  // --- Pairs path (scatter/path/3D) -----------------------------------------
  // Each runnable trace resolves to ONE signal (the first name its `.where`
  // filter targets); trace POSITION assigns the axis: line 1 → X, line 2 → Y,
  // line 3 → Z. This keeps the pairs plots MQL-driven off the same trace list.
  const pairNames = useMemo(() => {
    const out: string[] = [];
    for (const p of runnableFetches) {
      const n = queryToSignalNames(p.query, signalNames)[0];
      if (n) out.push(n);
    }
    return out;
  }, [runnableFetches, signalNames]);

  // Enough axes resolved to plot: 2 for scatter/path (X,Y), 3 for 3D (X,Y,Z).
  const pairReady =
    path === "pairs" &&
    (chartType === "scatter3d" ? pairNames.length >= 3 : pairNames.length >= 2);

  // The signal set a pairs fetch needs: every axis signal plus any color-by
  // signal (scatter/path only). Deduped.
  const pairFetchSignals = useMemo(() => {
    if (path !== "pairs") return [];
    const set = new Set(pairNames);
    if (
      (chartType === "scatter" || chartType === "path") &&
      colorBy !== "none" &&
      colorBy !== "time"
    )
      set.add(colorBy);
    return [...set];
  }, [path, pairNames, chartType, colorBy]);

  useEffect(() => {
    if (path !== "pairs") return;
    if (!vehicleId || !pairReady) {
      setPairsData({ columns: ["produced_at"], rows: [] });
      return;
    }
    let cancelled = false;
    setLoadingSeries(true);
    fetchPairs({ vehicleId, signals: pairFetchSignals, startIso, endIso })
      .then((resp) => {
        if (!cancelled) setPairsData(resp);
      })
      .catch((e) => {
        if (!cancelled) notify.error(getAxiosErrorMessage(e));
      })
      .finally(() => {
        if (!cancelled) setLoadingSeries(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    path,
    vehicleId,
    vehicleType,
    pairReady,
    pairFetchSignals.join(","),
    startIso,
    endIso,
  ]);

  // PlotConfig assembled from the resolved axis signals (by trace position).
  const plotConfig = useMemo<PlotConfig>(() => {
    const colorByOpt = colorBy === "none" ? undefined : colorBy;
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
        colorBy: colorByOpt,
      };
    }
    if (chartType === "scatter") {
      return {
        kind: "scatter",
        xSignal: x,
        ySignals: pairNames.slice(1),
        colorBy: colorByOpt,
      };
    }
    // categorical (catbar/pie): axes unused, data comes from runSeries.
    return { kind: chartType === "pie" ? "pie" : "catbar", ySignals: [] };
  }, [chartType, pairNames, colorBy]);

  // --- Assemble base + derived series ---------------------------------------
  // runSeries = every aggregate-fetched series concatenated IN TRACE ORDER (the
  // order of runnable fetch statements). Derived expressions read variables from
  // baseSeries (s0, s1, … by position); the chart stacks/ranks it.
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

  // Per-statement run/parse errors, keyed by statement id, for inline display.
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

  // Latency for the subtitle: the sum across every aggregate fetch statement.
  const seriesMs = useMemo(() => {
    const vals = fetchResults
      .map((r) => r.ms)
      .filter((m): m is number => m !== null);
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0);
  }, [fetchResults]);

  // Expression statements, in trace order, mapped to the DerivedTrace shape the
  // evaluator expects. The label is the expression text itself (it doubles as
  // the legend/tooltip name, matching the old derived-trace default).
  const exprTraces = useMemo(
    () =>
      classified
        .filter((c) => c.kind === "expr")
        .map((c) => ({
          id: c.stmt.id,
          label: c.stmt.mql.trim(),
          expression: c.stmt.mql,
        })),
    [classified],
  );

  // Variable hint table (s0 = current_ac, …) shown near the expression rows.
  const seriesVariables = useMemo(
    () => buildSeriesVariables(baseSeries),
    [baseSeries],
  );

  // Evaluate every expression statement against the fetched base series.
  const derivedResults = useMemo(
    () => computeDerivedSeries(baseSeries, exprTraces),
    [baseSeries, exprTraces],
  );

  const derivedSeries = useMemo(
    () =>
      derivedResults
        .map((r) => r.series)
        .filter((s): s is Series => s !== undefined),
    [derivedResults],
  );

  // Expression errors keyed by statement id (merged with fetch errors for
  // inline placement under their rows).
  const exprErrors = useMemo(() => {
    const out: Record<string, string> = {};
    for (const r of derivedResults) if (r.error) out[r.id] = r.error;
    return out;
  }, [derivedResults]);

  // Base series plus any derived traces — every trace the widget knows about.
  const plottedSeries = useMemo(
    () => [...baseSeries, ...derivedSeries],
    [baseSeries, derivedSeries],
  );

  // What actually reaches the chart: drop any trace the user has hidden (T11).
  const visibleSeries = useMemo(
    () =>
      plottedSeries.filter(
        (s) => !axisSettingFor(axisSettings, seriesLabel(s.tags)).hidden,
      ),
    [plottedSeries, axisSettings],
  );

  // Highlight bands evaluated against the base series.
  const { ranges: highlightRanges, errors: highlightErrors } = useMemo(
    () => evaluateHighlights(baseSeries, highlights),
    [baseSeries, highlights],
  );

  // Narrow the (potentially stale) settings map to just the plotted labels.
  const axisConfig = useMemo(() => {
    const out: Record<string, AxisSetting> = {};
    for (const s of visibleSeries) {
      const label = seriesLabel(s.tags);
      if (axisSettings[label]) out[label] = axisSettings[label];
    }
    return out;
  }, [visibleSeries, axisSettings]);

  // Per-label fill config: each fetch statement's `.fill` mode applies to every
  // series that statement produces (keyed by the fetched series' label).
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

  // How many advanced editors are configured — a badge so collapsing the
  // disclosure never hides active state. Counts highlights + any plotted trace
  // whose y-axis setting differs from default.
  const advancedCount = useMemo(() => {
    const bands = highlights.filter((h) => h.expression.trim() !== "").length;
    let axes = 0;
    for (const s of plottedSeries) {
      const st = axisSettings[seriesLabel(s.tags)];
      if (st && (st.normalize || st.hidden || st.axisGroup !== "1")) axes++;
    }
    return bands + axes;
  }, [highlights, axisSettings, plottedSeries]);

  // Patch one label's setting (merging over its current/default value).
  const updateAxisSetting = (label: string, patch: Partial<AxisSetting>) =>
    setAxisSettings((prev) => ({
      ...prev,
      [label]: { ...axisSettingFor(prev, label), ...patch },
    }));

  // --- Trace list mutators --------------------------------------------------
  const updateTraceMql = (id: string, mql: string) =>
    setTraces((prev) => prev.map((t) => (t.id === id ? { ...t, mql } : t)));

  const addTrace = () =>
    setTraces((prev) => [...prev, { id: newTraceId(), mql: "avg(value)" }]);

  const removeTrace = (id: string) =>
    setTraces((prev) =>
      // Never drop the last row — the widget always has at least one trace.
      prev.length <= 1 ? prev : prev.filter((t) => t.id !== id),
    );

  // Last successfully-parsed query per fetch row. A fetch-looking line keeps
  // rendering its chip builder even while its MQL is TRANSIENTLY unparseable
  // (mid-typing in the editable MQL line), so the builder never unmounts and
  // the caret/focus survive. The builder falls back to this cached query (or a
  // default) for those keystrokes; the inline parse error still surfaces.
  const lastGoodQuery = useRef<Map<string, Query>>(new Map());

  // Keep a local handle on this widget's ECharts instance for PNG export.
  const chartInstance = useRef<ECharts | null>(null);
  const handleChartReady = (instance: ECharts | null) => {
    chartInstance.current = instance;
    // Only the time-series chart shares the page hover/zoom `connect` group;
    // pairs/categorical axes aren't the shared time axis, so they stay out.
    onChartReady?.(instance);
  };
  const handlePlotReady = (instance: ECharts | null) => {
    chartInstance.current = instance;
  };

  // Categorical (catbar/pie) reuses the /query/run series: each series' total is
  // its bar/slice value (PlotChart sums the points).
  const categoricalSeries = path === "categorical" ? runSeries : [];

  // What the chart has to draw, per path.
  const hasData =
    path === "timeseries"
      ? visibleSeries.length > 0
      : path === "pairs"
        ? pairsData.rows.length > 0
        : categoricalSeries.length > 0;

  // Underlying data for the export dialog, adapted to the Series shape its
  // CSV/JSON serializers understand.
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

  const totalSeriesValue = useMemo(() => {
    let acc = 0;
    for (const s of baseSeries) for (const p of s.points) acc += p.value ?? 0;
    return acc;
  }, [baseSeries]);

  // In the pairs path, label each fetch row by the axis its position maps to
  // (line 1 → X, line 2 → Y, line 3 → Z for 3D; extra scatter rows are more Ys).
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
            {/* Trace list — one row per statement; both this and the raw MQL
                editor write the same `traces`. The "Edit as MQL" toggle swaps
                the whole list for a single textarea (one statement per line). */}
            <div className="flex flex-col gap-2">
              {editAsMql ? (
                <MqlEditor traces={traces} onChange={setTraces} />
              ) : (
                <div className="flex flex-col gap-3">
                  {classified.map((c) => {
                    const id = c.stmt.id;
                    const onlyRow = traces.length <= 1;
                    if (c.kind === "fetch") {
                      // Fetch row → the chip builder, bound to the parsed Query.
                      // We render the builder for ANY fetch-looking line (not
                      // only ones that currently parse) so a transiently-invalid
                      // MQL edit doesn't unmount it and steal focus; it falls
                      // back to the last-good query (or a default) and shows the
                      // parse error inline. The editable MQL line lets the user
                      // type directly; either path updates this statement.
                      const parsed = "query" in c ? c.query : undefined;
                      if (parsed) lastGoodQuery.current.set(id, parsed);
                      const builderValue =
                        parsed ?? lastGoodQuery.current.get(id) ?? DEFAULT_QUERY;
                      return (
                        <TraceRow key={id} onRemove={() => removeTrace(id)} disableRemove={onlyRow} axisLabel={pairAxisLabels[id]}>
                          <QueryBuilder
                            value={builderValue}
                            onChange={(next) => updateTraceMql(id, serializeQuery(next))}
                            onMqlChange={(mql) => updateTraceMql(id, mql)}
                            signalNames={signalNames}
                            error={fetchErrors[id] ?? null}
                          />
                        </TraceRow>
                      );
                    }
                    // Expression row → raw input. Expression errors come from
                    // the in-browser evaluator already formatted (no column).
                    const errMessage = exprErrors[id];
                    return (
                      <TraceRow key={id} onRemove={() => removeTrace(id)} disableRemove={onlyRow}>
                        <div className="flex flex-col gap-1">
                          <input
                            value={c.stmt.mql}
                            onChange={(e) => updateTraceMql(id, e.target.value)}
                            spellCheck={false}
                            placeholder="expression (e.g. s0 / s1) or fetch query"
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
                      </TraceRow>
                    );
                  })}

                  {/* Variable hint for expression rows: s0 = current_ac, … */}
                  {seriesVariables.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground/70">
                      <span className="uppercase tracking-wider">vars</span>
                      {seriesVariables.map((v) => (
                        <code key={v.index} className="font-mono">
                          {v.friendly ? `${v.index} = ${v.friendly}` : v.index}
                        </code>
                      ))}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={addTrace}
                    className="inline-flex h-7 w-fit items-center gap-1 rounded-md border border-dashed bg-transparent px-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent/40 hover:text-foreground"
                  >
                    <Plus className="h-3 w-3" />
                    Add trace
                  </button>
                </div>
              )}

              {/* Edit-as-MQL toggle — swaps chip rows ↔ one textarea. */}
              <button
                type="button"
                onClick={() => setEditAsMql((m) => !m)}
                className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {editAsMql ? "Edit with chips" : "Edit as MQL"}
              </button>
            </div>

            {/* Advanced options (T10): per-trace y-axis scaling + visibility,
                highlight bands. Time-series only — they operate on the shared
                time/bucket axis the pairs and categorical charts don't have. */}
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
                  />
                </div>
              )}
            </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Color-by (scatter/path only): a render option layered over the
                pairs data, not part of the MQL. */}
            {(chartType === "scatter" || chartType === "path") && (
              <Select value={colorBy} onValueChange={setColorBy}>
                <SelectTrigger className="h-8 w-[150px]" title="Color points by">
                  <SelectValue placeholder="Color by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No color</SelectItem>
                  <SelectItem value="time">Color: time</SelectItem>
                  {signalNames.map((n) => (
                    <SelectItem key={n} value={n}>
                      Color: {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <ChartTypeSelect value={chartType} onChange={changeChartType} />
            {hasData && (
              <button
                type="button"
                onClick={() => setExportOpen(true)}
                title="Export"
                className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Download className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onToggleHide}
              title={hidden ? "Show chart" : "Hide chart"}
              className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {hidden ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={onDelete}
              title="Delete widget"
              className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
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
                      `${formatCount(totalSeriesValue)} total`,
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
          {loadingSeries ? (
            <div className="flex h-[260px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : path !== "timeseries" ? (
            !hasData ? (
              <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                {path === "pairs"
                  ? "Set the axis signals (one per trace line) to plot"
                  : "No data in this window"}
              </div>
            ) : (
              <PlotChart
                config={plotConfig}
                pairs={pairsData}
                categorical={categoricalSeries}
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

/** One row of the trace list: its editing surface (chip builder or raw input)
 *  plus a remove button, disabled when it's the only row. */
function TraceRow({
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
        aria-label="Remove trace"
        title={disableRemove ? "A widget needs at least one trace" : "Remove trace"}
        className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// Re-exported so the page (or tests) can build a fresh trace list from text if
// needed; the widget itself sets traces directly.
export { textToTraces };

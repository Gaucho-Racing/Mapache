import {
  ChartTypeToggle,
  type ChartType,
} from "@/components/signals/ChartTypeToggle";
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
  DerivedTraces,
} from "@/components/signals/DerivedTraces";
import {
  axisSettingFor,
  TraceAxisControls,
} from "@/components/signals/TraceAxisControls";
import {
  evaluateHighlights,
  Highlights,
  type Highlight,
} from "@/components/signals/Highlights";
import type { DerivedTrace } from "@/lib/expr";
import {
  downloadChartPng,
  downloadText,
  seriesToCsv,
} from "@/lib/export";
import type { ECharts } from "echarts/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BACKEND_URL } from "@/consts/config";
import { getAxiosErrorMessage } from "@/lib/axios-error-handler";
import { notify } from "@/lib/notify";
import {
  DEFAULT_QUERY,
  type Query,
  type Rollup,
  serializeQuery,
} from "@/lib/query";
import axios from "axios";
import { Download, Eye, EyeOff, Image, Loader2, Trash2 } from "lucide-react";
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
    case "16ms":  return 0.016;
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
}: SignalWidgetProps) {
  // Chart-side state: the structured query AST, the result series, the
  // chosen chart type, and a query-execution error surfaced under the
  // builder. Each widget owns its own copy.
  const [queryAst, setQueryAst] = useState<Query>(DEFAULT_QUERY);
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [series, setSeries] = useState<Series[]>([]);
  // User-defined derived/expression traces, evaluated in-browser over the
  // fetched series (T5). Empty by default — zero-cost when unused.
  const [derivedTraces, setDerivedTraces] = useState<DerivedTrace[]>([]);
  // Per-trace y-scaling settings (T8), keyed by series label. Sparse: any
  // label absent here uses the default (shared group "1", un-normalized), so
  // an untouched widget renders exactly as it did before this feature.
  // Labels are stable across requery while the group-by yields the same
  // labels, so the user's choices persist through a refetch.
  const [axisSettings, setAxisSettings] = useState<
    Record<string, AxisSetting>
  >({});
  // Per-widget highlight conditions (T6), evaluated in-browser over the fetched
  // series to shade the bucket ranges where each condition holds. Empty by
  // default — zero-cost and visually identical to today when unused. Local to
  // this widget; never broadcast across panels.
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [seriesMs, setSeriesMs] = useState<number | null>(null);
  const [queryError, setQueryError] = useState<
    { message: string; position?: number } | null
  >(null);

  // Don't fire a request while a filter chip is still empty — the
  // serialized query (`... where name = ""`) is technically valid but
  // returns nothing useful, and it bombards the backend on every
  // chip-add. Skip until every filter has a value.
  const queryIsRunnable = queryAst.filters.every((f) => f.value.trim() !== "");

  const serializedQuery = useMemo(() => serializeQuery(queryAst), [queryAst]);

  // Effective interval = explicit rollup on the AST if present, else
  // auto-picked from the timeframe width. The backend honors the same
  // precedence; we mirror it client-side so the bucket label in the
  // subtitle and the x-axis formatting are right *before* the response
  // arrives (avoids a one-render flicker on rollup changes).
  const interval = useMemo(
    () => queryAst.rollup ?? autoInterval(rangeSeconds),
    [queryAst.rollup, rangeSeconds],
  );

  const intervalSec = intervalToSeconds(interval);

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
          vehicle_id: vehicleId,
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

  useEffect(() => {
    if (!vehicleId) return;
    if (!queryIsRunnable) return;
    runQuery();
    // Serialized form is the wire representation; depending on it (rather
    // than the AST object) means the effect only fires when the query
    // actually changes, not on every reference identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId, vehicleType, rangeSeconds, serializedQuery, queryIsRunnable, startIso, endIso]);

  const totalSeriesValue = useMemo(() => {
    let acc = 0;
    for (const s of series) for (const p of s.points) acc += p.value ?? 0;
    return acc;
  }, [series]);

  // Variable hint table (s0 = current_ac, …) shown in the derived-traces UI.
  const seriesVariables = useMemo(
    () => buildSeriesVariables(series),
    [series],
  );

  // Evaluate every derived trace against the fetched series. Returns the
  // computed Series alongside any per-trace parse/eval error. Recomputes only
  // when the data or the trace definitions change.
  const derivedResults = useMemo(
    () => computeDerivedSeries(series, derivedTraces),
    [series, derivedTraces],
  );

  // Split the results: successful series get appended to the chart input;
  // errors are surfaced inline under their row.
  const derivedSeries = useMemo(
    () =>
      derivedResults
        .map((r) => r.series)
        .filter((s): s is Series => s !== undefined),
    [derivedResults],
  );

  const derivedErrors = useMemo(() => {
    const out: Record<string, string> = {};
    for (const r of derivedResults) if (r.error) out[r.id] = r.error;
    return out;
  }, [derivedResults]);

  // Base series plus any derived traces — what actually gets plotted.
  const plottedSeries = useMemo(
    () => [...series, ...derivedSeries],
    [series, derivedSeries],
  );

  // Evaluate every highlight condition against the fetched base series (the
  // same `sN`/friendly variable model the derived traces use) in a single
  // pass: contiguous truthy buckets coalesce into inclusive index ranges the
  // chart paints as bands, and any compile/unknown-variable error is surfaced
  // inline in the editor (like derived traces). Each condition compiles once.
  // Recomputes only when the data or the highlight definitions change.
  const { ranges: highlightRanges, errors: highlightErrors } = useMemo(
    () => evaluateHighlights(series, highlights),
    [series, highlights],
  );

  // Narrow the (potentially stale) settings map to just the currently plotted
  // labels before handing it to the chart. The chart already defaults any
  // missing label, so this is mainly to keep the prop small and intentional;
  // settings for labels no longer present simply lie dormant until they
  // reappear (e.g. a requery that brings the same group-by labels back).
  const axisConfig = useMemo(() => {
    const out: Record<string, AxisSetting> = {};
    for (const s of plottedSeries) {
      const label = seriesLabel(s.tags);
      if (axisSettings[label]) out[label] = axisSettings[label];
    }
    return out;
  }, [plottedSeries, axisSettings]);

  // label → rendered line color, mirroring the chart's top-K reordering so the
  // controls' swatches match the on-screen lines.
  const seriesColors = useMemo(
    () => seriesColorMap(plottedSeries),
    [plottedSeries],
  );

  // Patch one label's setting (merging over its current/default value).
  const updateAxisSetting = (label: string, patch: Partial<AxisSetting>) =>
    setAxisSettings((prev) => ({
      ...prev,
      [label]: { ...axisSettingFor(prev, label), ...patch },
    }));

  // Keep a local handle on this widget's ECharts instance for PNG export,
  // while still forwarding to the page's group-zoom registry. The chart hands
  // us `null` on teardown.
  const chartInstance = useRef<ECharts | null>(null);
  const handleChartReady = (instance: ECharts | null) => {
    chartInstance.current = instance;
    onChartReady?.(instance);
  };

  // Whether there's anything to export — the export controls hide entirely
  // when the widget has no fetched data, so they never produce an empty file.
  const hasData = plottedSeries.length > 0;

  // Export the plotted series (base + derived traces) as CSV, and the live
  // chart as a 2x PNG. Both pull from exactly what's on screen.
  const exportCsv = () =>
    downloadText(seriesToCsv(plottedSeries), "signals.csv", "text/csv");
  const exportPng = () => {
    const inst = chartInstance.current;
    if (inst) downloadChartPng(inst, "signals.png");
  };

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-1 flex-col gap-3">
            <QueryBuilder
              value={queryAst}
              onChange={setQueryAst}
              signalNames={signalNames}
              error={queryError}
            />
            <DerivedTraces
              traces={derivedTraces}
              onChange={setDerivedTraces}
              variables={seriesVariables}
              errors={derivedErrors}
            />
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
          <div className="flex items-center gap-2">
            <ChartTypeToggle value={chartType} onChange={setChartType} />
            {/* Export the underlying data (CSV) and the chart image (PNG).
                Hidden when there's nothing plotted so we never export an empty
                file. PNG needs a live instance, so it's gated on the chart
                being visible (not collapsed). */}
            {hasData && (
              <>
                <button
                  type="button"
                  onClick={exportCsv}
                  title="Export data as CSV"
                  className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <Download className="h-4 w-4" />
                </button>
                {!hidden && (
                  <button
                    type="button"
                    onClick={exportPng}
                    title="Export chart as PNG"
                    className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <Image className="h-4 w-4" />
                  </button>
                )}
              </>
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
              {series.length > 1 ? `${series.length} series` : "Query result"}
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
        )}
      </CardHeader>
      {!hidden && (
        <CardContent>
          {loadingSeries ? (
            <div className="flex h-[260px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <QueryChart
              series={plottedSeries}
              type={chartType}
              intervalSec={intervalSec}
              groupId={groupId}
              onBrushSelect={onBrushSelect}
              onReady={handleChartReady}
              axisConfig={axisConfig}
              highlights={highlightRanges}
            />
          )}
        </CardContent>
      )}
    </Card>
  );
}

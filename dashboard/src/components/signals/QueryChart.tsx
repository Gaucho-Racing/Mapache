import * as echarts from "echarts/core";
import { BarChart, LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  MarkAreaComponent,
  DataZoomInsideComponent,
  TitleComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type {
  ECharts,
  EChartsCoreOption,
  ElementEvent,
} from "echarts/core";
import { useEffect, useMemo, useRef } from "react";
import type { ChartType } from "./ChartTypeToggle";
import type { FillMode } from "@/lib/query";
import { PALETTE, cssHsl, seriesTotal } from "@/lib/echartsTheme";
import { useEchartInstance } from "@/lib/useEchartInstance";
import { formatMetric } from "@/lib/format";

// Re-exported so existing importers (PlotChart, swatches) can keep pulling the
// shared palette from the chart module they already depend on.
export { PALETTE };

// `inside` dataZoom only (wheel-zoom, client-side); the slider is skipped to
// keep the gesture surface clear for the left-drag brush.
echarts.use([
  BarChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  MarkAreaComponent,
  DataZoomInsideComponent,
  TitleComponent,
  CanvasRenderer,
]);

export interface SeriesPoint {
  bucket: string;
  value: number | null;
}

export interface Series {
  tags: Record<string, string | null>;
  points: SeriesPoint[];
}

/** Per-trace y-scaling, keyed by `seriesLabel(tags)`. `native` traces share
 *  one real-value axis per `axisGroup`; `normalize` min/max-rescales to [0,1]
 *  on a hidden shared axis. `hidden` keeps a trace fetched but off the chart
 *  (the widget filters it before passing `series`); it lives here only to
 *  persist in the same per-label map. Default = group "1", un-normalized. */
export interface AxisSetting {
  axisGroup: string;
  normalize: boolean;
  hidden?: boolean;
}

interface QueryChartProps {
  series: Series[];
  /** Time-series renderings only — non-time chart types are PlotChart's. */
  type: Extract<ChartType, "bar" | "line" | "area">;
  /** Seconds per bucket — drives x-axis tick formatting. */
  intervalSec: number;
  /** Series shown before the rest roll into "+N other". */
  maxSeries?: number;
  /** Click-and-drag brush; commits [start, end) of the window on mouse-up. */
  onBrushSelect?: (start: Date, end: Date) => void;
  /** Left-drag mode: "select" brushes a timeframe, "pan" slides the zoom
   *  window. Read live via a ref, so toggling never re-inits the chart. */
  interactionMode?: "select" | "pan";
  /** Joins an `echarts.connect` group so axisPointer + tooltip sync across
   *  every chart sharing the id. */
  groupId?: string;
  /** Receives the ECharts instance after init (and `null` on teardown) so the
   *  page can drive group-wide dataZoom. */
  onReady?: (instance: ECharts | null) => void;
  /** Per-series y-scaling, keyed by series label. Sparse; absent = default. */
  axisConfig?: Record<string, AxisSetting>;
  /** Highlight bands over bucket index ranges where a condition holds, drawn as
   *  a silent `__highlight__` markArea behind the data. */
  highlights?: { id: string; color: string; ranges: [number, number][] }[];
  /** Per-series null-gap fill, keyed by series label. Sparse; absent = "gap".
   *  Only plotted data honors fill — ranking and export read the raw series. */
  fillConfig?: Record<string, FillMode>;
}

const OTHER_KEY = "__other__";

// Tag key marking a user-defined derived/expression trace (value = its label).
// Rendered as standalone lines, exempt from top-K rollup.
export const DERIVED_KEY = "__derived__";

function isDerived(s: Series): boolean {
  return DERIVED_KEY in s.tags;
}

function formatBucketTick(iso: string, intervalSec: number): string {
  const d = new Date(iso);
  if (intervalSec >= 24 * 60 * 60) {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  if (intervalSec >= 60 * 60) {
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
    });
  }
  if (intervalSec >= 60) {
    return d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  // Sub-second buckets need millisecond precision to be distinguishable.
  if (intervalSec < 1) {
    const base = d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
    const ms = d.getMilliseconds().toString().padStart(3, "0");
    return `${base}.${ms}`;
  }
  // Sub-minute buckets need seconds to be distinguishable.
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Stable label for a series from its tag values (empty tags → "value").
 *  Derived traces carry their label in the reserved tag. */
export function seriesLabel(tags: Record<string, string | null>): string {
  if (DERIVED_KEY in tags) return tags[DERIVED_KEY] ?? "derived";
  const entries = Object.entries(tags);
  if (entries.length === 0) return "value";
  return entries.map(([, v]) => v ?? "—").join(" · ");
}

/** Roll base series past `max` into a single "+N other" series. Derived traces
 *  are exempt and don't participate in the ranking. */
function topK(series: Series[], max: number): { kept: Series[]; otherCount: number } {
  const derived = series.filter(isDerived);
  const base = series.filter((s) => !isDerived(s));
  if (base.length <= max) return { kept: [...base, ...derived], otherCount: 0 };
  const sorted = [...base].sort((a, b) => seriesTotal(b) - seriesTotal(a));
  const kept = sorted.slice(0, max);
  const tail = sorted.slice(max);
  // Sum point-by-point; every series shares the server-zero-filled bucket axis.
  const refBuckets = sorted[0]?.points ?? [];
  const otherPoints: SeriesPoint[] = refBuckets.map((p, i) => {
    let sum = 0;
    for (const s of tail) sum += s.points[i]?.value ?? 0;
    return { bucket: p.bucket, value: sum };
  });
  kept.push({ tags: { [OTHER_KEY]: `+${tail.length} other` }, points: otherPoints });
  return { kept: [...kept, ...derived], otherCount: tail.length };
}

/** Map each plotted series' label to its rendered palette color (applying the
 *  same top-K reordering) so external swatches match the on-screen lines.
 *  "+N other" is omitted. */
export function seriesColorMap(
  series: Series[],
  maxSeries = 10,
): Map<string, string> {
  const { kept } = topK(series, maxSeries);
  const map = new Map<string, string>();
  kept.forEach((s, i) => {
    if (OTHER_KEY in s.tags) return; // keep `i` so real series keep their index
    map.set(seriesLabel(s.tags), PALETTE[i % PALETTE.length]);
  });
  return map;
}

/** Default y-scaling for an unconfigured label: native group "1". */
function settingFor(
  axisConfig: Record<string, AxisSetting> | undefined,
  label: string,
): AxisSetting {
  return axisConfig?.[label] ?? { axisGroup: "1", normalize: false };
}

/** Default fill for an unconfigured label: "gap" (nulls break the line). */
function fillFor(
  fillConfig: Record<string, FillMode> | undefined,
  label: string,
): FillMode {
  return fillConfig?.[label] ?? "gap";
}

export function QueryChart({
  series,
  type,
  intervalSec,
  maxSeries = 10,
  onBrushSelect,
  groupId,
  onReady,
  axisConfig,
  highlights,
  fillConfig,
  interactionMode = "select",
}: QueryChartProps) {
  const { kept } = useMemo(() => topK(series, maxSeries), [series, maxSeries]);

  // Shape into ECharts' columnar form: a shared category axis of bucket ISO
  // strings plus one value array per series.
  const { buckets, plotSeries } = useMemo(() => {
    const buckets = kept[0]?.points.map((p) => p.bucket) ?? [];
    const plotSeries = kept.map((s, i) => {
      const label = seriesLabel(s.tags);
      const setting = settingFor(axisConfig, label);
      const derived = isDerived(s);
      const fill = fillFor(fillConfig, label);
      // Nulls preserved: empty non-count buckets stay null so they render as
      // no-data, not phantom 0-troughs.
      const trueVals = buckets.map((_, bi) => s.points[bi]?.value ?? null);
      // gap/linear keep nulls (differ only in connectNulls); last forward-fills
      // (leading nulls stay null). Derived traces are always "gap".
      const effFill: FillMode = derived ? "gap" : fill;
      let data: Array<number | null>;
      if (effFill === "last") {
        let prev: number | null = null;
        data = trueVals.map((v) => {
          if (v !== null) {
            prev = v;
            return v;
          }
          return prev;
        });
      } else {
        data = trueVals;
      }
      return {
        key: `s${i}`,
        label,
        color: PALETTE[i % PALETTE.length],
        derived,
        normalize: setting.normalize,
        axisGroup: setting.axisGroup,
        connectNulls: effFill === "linear",
        raw: data,
      };
    });
    return { buckets, plotSeries };
  }, [kept, axisConfig, fillConfig]);

  // Distinct native axis groups in first-seen order (first renders left with
  // split lines, the rest on the right); plus a hidden [0,1] axis when any
  // trace is normalized. Collapses to a single left axis when neither applies.
  const { nativeGroups, hasNormalized } = useMemo(() => {
    const order: string[] = [];
    let anyNorm = false;
    for (const s of plotSeries) {
      if (s.normalize) {
        anyNorm = true;
      } else if (!order.includes(s.axisGroup)) {
        order.push(s.axisGroup);
      }
    }
    // At least one native axis even if every series is normalized.
    if (order.length === 0) order.push("1");
    return { nativeGroups: order, hasNormalized: anyNorm };
  }, [plotSeries]);

  const normalizedAxisIndex = hasNormalized ? nativeGroups.length : -1;

  // Stack only when all base (non-derived, non-normalized) series share one
  // native group; mixed scales can't stack meaningfully.
  const stackableBase = plotSeries.filter((s) => !s.derived && !s.normalize);
  const singleNativeGroup =
    stackableBase.length > 0 &&
    stackableBase.every((s) => s.axisGroup === stackableBase[0].axisGroup);
  const stackBase =
    stackableBase.length > 1 && singleNativeGroup && type !== "line"
      ? "stack"
      : undefined;

  const chartRef = useRef<HTMLDivElement | null>(null);
  // These refs feed the zrender handlers the latest props without re-binding,
  // keeping the once-only init honest.
  const brushRef = useRef<{ startIdx: number | null; curIdx: number | null }>({
    startIdx: null,
    curIdx: null,
  });
  const cbRef = useRef<{
    onBrushSelect?: (start: Date, end: Date) => void;
    buckets: string[];
    intervalSec: number;
    interactionMode: "select" | "pan";
  }>({ onBrushSelect, buckets, intervalSec, interactionMode });
  cbRef.current = { onBrushSelect, buckets, intervalSec, interactionMode };

  // Instance lifecycle (init + connect group + resize + dispose + onReady) lives
  // in the shared hook; the brush-to-select zrender wiring is attached via
  // onInit so it keeps the exact attach-after-init / detach-before-dispose
  // ordering it had as one effect.
  const instanceRef = useEchartInstance(chartRef, {
    groupId,
    onReady,
    onInit: (inst) => {
      // Brush-to-select-timeframe: mousedown records the bucket, mousemove draws
      // a markArea, mouseup commits [start, end) — but only across different
      // buckets (same-bucket release is a click). `end` is extended one bucket
      // width so the brush includes the bar it visually covers.
      const zr = inst.getZr();

      // Pixel x → nearest category index, or null if outside the plot.
      const pixelToIndex = (event: ElementEvent): number | null => {
        const x = event.offsetX;
        const y = event.offsetY;
        if (!inst.containPixel({ gridIndex: 0 }, [x, y])) return null;
        const val = inst.convertFromPixel({ gridIndex: 0 }, [x, y]);
        const idx = Array.isArray(val) ? Math.round(val[0] as number) : null;
        if (idx === null) return null;
        const len = cbRef.current.buckets.length;
        if (idx < 0 || idx >= len) return null;
        return idx;
      };

      const renderHighlight = () => {
        const { startIdx, curIdx } = brushRef.current;
        if (startIdx === null || curIdx === null || startIdx === curIdx) {
          inst.setOption({ series: [{ id: "__brush__", markArea: { data: [] } }] });
          return;
        }
        const lo = Math.min(startIdx, curIdx);
        const hi = Math.max(startIdx, curIdx);
        inst.setOption({
          series: [
            {
              id: "__brush__",
              type: "line",
              data: [],
              silent: true,
              markArea: {
                itemStyle: { color: cssHsl("--foreground", "#fafafa", 0.12) },
                data: [[{ xAxis: lo }, { xAxis: hi }]],
              },
            },
          ],
        });
      };

      const onDown = (event: ElementEvent) => {
        // In pan mode the dataZoom owns left-drag; the brush stands down.
        if (cbRef.current.interactionMode === "pan") return;
        if (!cbRef.current.onBrushSelect) return;
        const idx = pixelToIndex(event);
        if (idx === null) return;
        brushRef.current = { startIdx: idx, curIdx: idx };
      };
      const onMove = (event: ElementEvent) => {
        if (cbRef.current.interactionMode === "pan") return;
        if (!cbRef.current.onBrushSelect) return;
        if (brushRef.current.startIdx === null) return;
        const idx = pixelToIndex(event);
        if (idx === null) return;
        brushRef.current.curIdx = idx;
        renderHighlight();
      };
      const commit = () => {
        const { onBrushSelect: cb, buckets: bkts, intervalSec: iv } =
          cbRef.current;
        const { startIdx, curIdx } = brushRef.current;
        brushRef.current = { startIdx: null, curIdx: null };
        renderHighlight();
        if (
          cb &&
          startIdx !== null &&
          curIdx !== null &&
          startIdx !== curIdx
        ) {
          const lo = Math.min(startIdx, curIdx);
          const hi = Math.max(startIdx, curIdx);
          const startIso = bkts[lo];
          const endIso = bkts[hi];
          if (startIso && endIso) {
            const start = new Date(startIso);
            // Extend to the end of the bucket so the covered bar is included.
            const end = new Date(new Date(endIso).getTime() + iv * 1000);
            cb(start, end);
          }
        }
      };

      const onGlobalOut = () => {
        if (brushRef.current.startIdx !== null) {
          brushRef.current = { startIdx: null, curIdx: null };
          renderHighlight();
        }
      };

      zr.on("mousedown", onDown);
      zr.on("mousemove", onMove);
      zr.on("mouseup", commit);
      // Cancel an in-progress drag if the cursor leaves the canvas.
      zr.on("globalout", onGlobalOut);

      return () => {
        zr.off("mousedown", onDown);
        zr.off("mousemove", onMove);
        zr.off("mouseup", commit);
        zr.off("globalout", onGlobalOut);
      };
    },
  });

  // Build the ECharts option (memoized; the brush markArea is layered on
  // separately during a drag).
  const option = useMemo<EChartsCoreOption>(() => {
    const axisLabelColor = cssHsl("--muted-foreground", "#a1a1aa");
    const splitLineColor = cssHsl("--border", "#27272a");

    // Color each native axis to the first trace bound to its group.
    const groupColor = new Map<string, string>();
    for (const s of plotSeries) {
      if (s.normalize) continue;
      if (!groupColor.has(s.axisGroup)) groupColor.set(s.axisGroup, s.color);
    }
    // Right-side native axes each claim a 48px gutter; grow the right margin.
    const rightAxisCount = Math.max(0, nativeGroups.length - 1);

    const echartsSeries = plotSeries.map((s) => {
      const yAxisIndex = s.normalize
        ? normalizedAxisIndex
        : nativeGroups.indexOf(s.axisGroup);
      // Native series plot raw numbers; normalized series rescale to [0,1] on
      // the hidden axis, emitting `{ value, raw }` so the tooltip recovers the
      // true value. Nulls survive throughout so gaps render as no-data.
      let data: Array<number | { value: number; raw: number } | null> = s.raw;
      if (s.normalize) {
        // Ignore nulls so a gap doesn't drag the scale to 0.
        let min = Infinity;
        let max = -Infinity;
        for (const v of s.raw) {
          if (v === null) continue;
          if (v < min) min = v;
          if (v > max) max = v;
        }
        const span = max - min;
        data = s.raw.map((v) =>
          v === null
            ? null
            : {
                // Flat trace (span 0) parks mid-plot so it stays visible.
                value: span === 0 ? 0.5 : (v - min) / span,
                raw: v,
              },
        );
      }

      // Derived traces are always a clean unstacked overlay line.
      if (s.derived) {
        return {
          id: s.key,
          name: s.label,
          data,
          yAxisIndex,
          type: "line" as const,
          smooth: true,
          showSymbol: false,
          connectNulls: s.connectNulls,
          itemStyle: { color: s.color },
          lineStyle: { width: 2, color: s.color },
        };
      }
      const base = {
        id: s.key,
        name: s.label,
        data,
        yAxisIndex,
        itemStyle: { color: s.color },
        ...(stackBase ? { stack: stackBase } : {}),
      };
      if (type === "bar") {
        return {
          ...base,
          type: "bar" as const,
          itemStyle: { color: s.color, borderRadius: [2, 2, 0, 0] },
        };
      }
      if (type === "line") {
        return {
          ...base,
          type: "line" as const,
          smooth: true,
          showSymbol: false,
          connectNulls: s.connectNulls,
          lineStyle: { width: 2, color: s.color },
        };
      }
      // area
      return {
        ...base,
        type: "line" as const,
        smooth: true,
        showSymbol: false,
        connectNulls: s.connectNulls,
        lineStyle: { width: 2, color: s.color },
        areaStyle: { color: s.color, opacity: 0.25 },
      };
    });

    // Highlight bands on their own silent `__highlight__` series, kept separate
    // from the transient `__brush__` markArea. `silent` keeps it from
    // intercepting the brush handlers; `z: 0` parks it behind the data.
    const highlightAreas = (highlights ?? []).flatMap((h) =>
      h.ranges.map(([lo, hi]) => [
        { xAxis: lo, itemStyle: { color: h.color } },
        { xAxis: hi },
      ]),
    );
    const highlightSeries = {
      id: "__highlight__",
      type: "line" as const,
      data: [],
      silent: true,
      z: 0,
      markArea: {
        silent: true,
        itemStyle: { color: "transparent" }, // per-band itemStyle overrides this
        data: highlightAreas,
      },
    };

    return {
      animation: false,
      grid: {
        top: 8,
        right: 8 + rightAxisCount * 48, // gutter per extra right-side axis
        bottom: 24,
        left: 56,
        containLabel: false,
      },
      tooltip: {
        trigger: "axis",
        // The shared axisPointer is what `echarts.connect` syncs across charts.
        axisPointer: { type: "line" },
        backgroundColor: cssHsl("--popover", "#18181b"),
        borderColor: splitLineColor,
        textStyle: { color: cssHsl("--popover-foreground", "#fafafa") },
        formatter: (params: unknown) => {
          const arr = Array.isArray(params) ? params : [params];
          if (arr.length === 0) return "";
          const iso = buckets[(arr[0] as { dataIndex: number }).dataIndex];
          const header = iso ? new Date(iso).toLocaleString() : "";
          const rows = (
            arr as Array<{
              seriesName: string;
              value: number;
              marker: string;
              // Normalized series carry the true value on `data.raw`.
              data: number | { value: number; raw: number } | null;
            }>
          )
            .map((p) => {
              // Null buckets show as no-data rather than a misleading 0.
              const isNull =
                p.data === null || p.value === null || p.value === undefined;
              const trueValue =
                p.data !== null &&
                typeof p.data === "object" &&
                "raw" in p.data
                  ? p.data.raw
                  : p.value;
              const shown = isNull ? "—" : formatMetric(trueValue);
              return (
                `<div style="display:flex;justify-content:space-between;gap:12px">` +
                `<span>${p.marker}${p.seriesName}</span>` +
                `<span style="font-variant-numeric:tabular-nums">${shown}</span></div>`
              );
            })
            .join("");
          return `<div style="font-weight:500;margin-bottom:4px">${header}</div>${rows}`;
        },
      },
      xAxis: {
        type: "category" as const,
        data: buckets,
        boundaryGap: type === "bar",
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: {
          color: axisLabelColor,
          hideOverlap: true,
          formatter: (v: string) => formatBucketTick(v, intervalSec),
        },
      },
      // One value axis per native group (first on the left with split lines,
      // the rest on the right offset 48px each, no split lines) plus a hidden
      // [0,1] axis when any trace is normalized.
      yAxis: [
        ...nativeGroups.map((g, gi) => {
          const primary = gi === 0;
          // Color-code axes only when there are multiple native groups.
          const color =
            rightAxisCount > 0
              ? groupColor.get(g) ?? axisLabelColor
              : axisLabelColor;
          if (primary) {
            return {
              type: "value" as const,
              axisTick: { show: false },
              axisLine:
                rightAxisCount > 0
                  ? { show: true, lineStyle: { color } }
                  : { show: false },
              axisLabel: { color, formatter: formatMetric },
              splitLine: { lineStyle: { color: splitLineColor, type: "dashed" } },
            };
          }
          return {
            type: "value" as const,
            position: "right" as const,
            offset: (gi - 1) * 48,
            axisTick: { show: false },
            axisLine: { show: true, lineStyle: { color } },
            axisLabel: { color, formatter: formatMetric },
            splitLine: { show: false },
          };
        }),
        ...(hasNormalized
          ? [
              {
                // Hidden shared normalized axis, fixed [0,1].
                type: "value" as const,
                min: 0,
                max: 1,
                axisTick: { show: false },
                axisLine: { show: false },
                axisLabel: { show: false },
                splitLine: { show: false },
              },
            ]
          : []),
      ],
      // Client-side wheel-zoom over the bucket axis (never refetches). Left-drag
      // pans only in pan mode; the brush owns it in select mode. `filterMode:
      // "none"` keeps out-of-window points so lines aren't clipped at the edges.
      dataZoom: [
        {
          id: "__inside_zoom__",
          type: "inside",
          xAxisIndex: 0,
          zoomOnMouseWheel: true,
          moveOnMouseWheel: false,
          // `moveOnMouseMove` is owned by a dedicated effect so flipping
          // select/pan doesn't rebuild this whole (expensive) option.
          moveOnMouseMove: false,
          filterMode: "none",
        },
      ],
      series: [...echartsSeries, highlightSeries],
    };
  }, [
    plotSeries,
    buckets,
    type,
    stackBase,
    intervalSec,
    nativeGroups,
    hasNormalized,
    normalizedAxisIndex,
    highlights,
  ]);

  // Push option changes, capturing the live zoom window first so a notMerge
  // rebuild (e.g. a chart-type toggle) doesn't snap back to the full range.
  // A placeholder `__brush__` series keeps its id slot stable.
  useEffect(() => {
    const inst = instanceRef.current;
    if (!inst) return;
    // getOption() is undefined until the first setOption.
    const prevOption = inst.getOption() as
      | { dataZoom?: Array<{ start?: number; end?: number }> }
      | undefined;
    const curZoom = prevOption?.dataZoom?.[0];
    const opt = option as {
      series: unknown[];
      dataZoom: Array<Record<string, unknown>>;
    };
    const dataZoom =
      curZoom &&
      typeof curZoom.start === "number" &&
      typeof curZoom.end === "number"
        ? [{ ...opt.dataZoom[0], start: curZoom.start, end: curZoom.end }]
        : opt.dataZoom;
    inst.setOption(
      {
        ...opt,
        dataZoom,
        series: [...opt.series, { id: "__brush__", type: "line", data: [] }],
      },
      { notMerge: true },
    );
  }, [option]);

  // Apply the left-drag mode as a cheap merge so toggling select/pan never
  // rebuilds the full option. Re-runs after an option change too, since the
  // notMerge re-render above resets the dataZoom to its `false` default.
  useEffect(() => {
    const inst = instanceRef.current;
    if (!inst) return;
    inst.setOption({
      dataZoom: [
        { id: "__inside_zoom__", moveOnMouseMove: interactionMode === "pan" },
      ],
    });
  }, [interactionMode, option]);

  // Clear any in-flight brush state when switching into pan mid-drag, so the
  // gesture can't leak across modes.
  useEffect(() => {
    if (interactionMode !== "pan") return;
    brushRef.current = { startIdx: null, curIdx: null };
    const inst = instanceRef.current;
    if (!inst) return;
    inst.setOption({ series: [{ id: "__brush__", markArea: { data: [] } }] });
  }, [interactionMode]);

  // Keep the container mounted even with no data (empty state is an overlay,
  // not an early return) so the once-only init effect always has a node.
  return (
    <div className="relative h-[260px] w-full">
      <div
        ref={chartRef}
        className="h-full w-full"
        style={
          interactionMode === "pan"
            ? { userSelect: "none", cursor: "grab" }
            : onBrushSelect
              ? { userSelect: "none", cursor: "crosshair" }
              : undefined
        }
      />
      {buckets.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          No data in this window
        </div>
      )}
    </div>
  );
}

import * as echarts from "echarts/core";
import { BarChart, LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  MarkAreaComponent,
  DataZoomInsideComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type {
  ECharts,
  EChartsCoreOption,
  ElementEvent,
} from "echarts/core";
import { useEffect, useMemo, useRef } from "react";
import type { ChartType } from "./ChartTypeToggle";

// Canvas renderer only — that's the whole point of moving off recharts.
// One <canvas> for the entire plot means a >20k-point query draws without
// hanging the tab, so there's no longer a "render anyway" confirm gate.
echarts.use([
  BarChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  MarkAreaComponent,
  // `inside` dataZoom only — mouse-wheel zoom over the (already-fetched)
  // category axis. This is purely client-side magnification and never
  // triggers a requery; the brush (zrender left-drag) is what sets the
  // page timeframe and refetches. We deliberately skip the slider
  // component to keep the gesture surface clear of the left-drag brush.
  DataZoomInsideComponent,
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

interface QueryChartProps {
  series: Series[];
  type: ChartType;
  /** Number of seconds per bucket — drives the x-axis tick formatting. */
  intervalSec: number;
  /** Max series shown before everything beyond gets rolled into "other".
   *  Past ~12 the legend stops being useful. */
  maxSeries?: number;
  /** If set, click-and-drag on the chart highlights a range and commits
   *  it on mouse-up. Receives the [start, end) of the brushed window. */
  onBrushSelect?: (start: Date, end: Date) => void;
  /** If set, joins this chart to an ECharts connection group (via
   *  `inst.group = groupId` + `echarts.connect`) so the axisPointer cursor
   *  and tooltip sync across every chart sharing the same id. Additive —
   *  when absent the chart behaves exactly as before. */
  groupId?: string;
  /** Called once with the ECharts instance after init (and with `null` on
   *  teardown). Lets the page dispatch group-wide dataZoom actions (zoom
   *  out / reset) through any one panel — the `connect` group rebroadcasts
   *  to the rest. Additive; standalone charts simply omit it. */
  onReady?: (instance: ECharts | null) => void;
}

// Stable, high-contrast palette. Datadog-ish saturated colors that survive
// dark backgrounds — first slot deliberately matches our existing gr-pink
// so single-series bars don't change color when you flip into multi-series.
const PALETTE = [
  "#e105a3",
  "#8412fc",
  "#10b981",
  "#f59e0b",
  "#3b82f6",
  "#ef4444",
  "#06b6d4",
  "#84cc16",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

const OTHER_KEY = "__other__";

// Tag key marking a series as a user-defined derived/expression trace. The
// chart renders these as standalone (non-stacked) lines and never rolls them
// into the top-K "other" bucket — they're explicit additions by the user.
// The tag value is the trace's display label.
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
  // Sub-second buckets need millisecond precision — otherwise every tick
  // in a 50ms rollup reads the same "1:23:45 PM" and they're
  // indistinguishable. Append the zero-padded milliseconds.
  if (intervalSec < 1) {
    const base = d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
    const ms = d.getMilliseconds().toString().padStart(3, "0");
    return `${base}.${ms}`;
  }
  // Sub-minute buckets need seconds — otherwise every tick reads the
  // same "1:23 PM" and the user can't tell them apart.
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatCount(n: number): string {
  const abs = Math.abs(n);
  if (abs < 1_000) return Number.isInteger(n) ? n.toString() : n.toFixed(2);
  if (abs < 1_000_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}

/** Make a stable label for a series from its tag values. Empty tags →
 *  "value" so the single-series legend reads naturally. Derived traces carry
 *  their display label directly in the reserved tag. Exported so the widget
 *  can build matching variable aliases (`current_ac` from a `current_ac`
 *  series) for the derived-trace expression evaluator. */
export function seriesLabel(tags: Record<string, string | null>): string {
  if (DERIVED_KEY in tags) return tags[DERIVED_KEY] ?? "derived";
  const entries = Object.entries(tags);
  if (entries.length === 0) return "value";
  return entries.map(([, v]) => v ?? "—").join(" · ");
}

/** Sum every point in a series — for top-K ranking. Null values are 0. */
function seriesTotal(s: Series): number {
  let acc = 0;
  for (const p of s.points) acc += p.value ?? 0;
  return acc;
}

/** Roll any series past `max` into a single "other" bucket so the chart
 *  stays readable when a query produces hundreds of groups. Derived traces
 *  are exempt — the user added them explicitly, so they always survive and
 *  only the raw base series participate in the top-K ranking/rollup. */
function topK(series: Series[], max: number): { kept: Series[]; otherCount: number } {
  const derived = series.filter(isDerived);
  const base = series.filter((s) => !isDerived(s));
  if (base.length <= max) return { kept: [...base, ...derived], otherCount: 0 };
  const sorted = [...base].sort((a, b) => seriesTotal(b) - seriesTotal(a));
  const kept = sorted.slice(0, max);
  const tail = sorted.slice(max);
  // Build the "other" series by summing point-by-point across the tail.
  // Every series shares the same bucket axis (server zero-fills), so a
  // simple index walk is correct.
  const refBuckets = sorted[0]?.points ?? [];
  const otherPoints: SeriesPoint[] = refBuckets.map((p, i) => {
    let sum = 0;
    for (const s of tail) sum += s.points[i]?.value ?? 0;
    return { bucket: p.bucket, value: sum };
  });
  kept.push({ tags: { [OTHER_KEY]: `+${tail.length} other` }, points: otherPoints });
  // Derived traces ride along untouched after the rollup.
  return { kept: [...kept, ...derived], otherCount: tail.length };
}

/** Resolve an HSL CSS custom property (stored as "H S% L%") to an
 *  `hsl(...)` string ECharts can consume, with an optional alpha. Falls
 *  back to a sane dark-theme grey if the var is missing (e.g. SSR). */
function cssHsl(varName: string, fallback: string, alpha = 1): string {
  if (typeof window === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  if (!raw) return fallback;
  return alpha === 1 ? `hsl(${raw})` : `hsl(${raw} / ${alpha})`;
}

export function QueryChart({
  series,
  type,
  intervalSec,
  maxSeries = 10,
  onBrushSelect,
  groupId,
  onReady,
}: QueryChartProps) {
  // Top-K rollup before any other shaping; bar/area would stack hundreds
  // of slivers otherwise.
  const { kept } = useMemo(() => topK(series, maxSeries), [series, maxSeries]);

  // Shape into the columnar form ECharts wants: a shared category axis of
  // bucket ISO strings plus one value array per series. Series keys mirror
  // the old "s0", "s1", ... indexing so colors stay stable by position.
  const { buckets, plotSeries } = useMemo(() => {
    const buckets = kept[0]?.points.map((p) => p.bucket) ?? [];
    const plotSeries = kept.map((s, i) => ({
      key: `s${i}`,
      label: seriesLabel(s.tags),
      color: PALETTE[i % PALETTE.length],
      // Derived/expression traces render as standalone lines and never join
      // the stacked bar/area group (a series and its square stacking on top
      // of each other would be misleading).
      derived: isDerived(s),
      // Nulls render as 0, matching the old recharts behavior (it coerced
      // null → 0 in the pivot).
      values: buckets.map((_, bi) => s.points[bi]?.value ?? 0),
    }));
    return { buckets, plotSeries };
  }, [kept]);

  // Stacking is decided per-series below; the group is only meaningful when
  // there are 2+ *base* (non-derived) series and the chart type stacks.
  const baseCount = plotSeries.filter((s) => !s.derived).length;
  const stackBase = baseCount > 1 && type !== "line" ? "stack" : undefined;

  const chartRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<ECharts | null>(null);
  // groupId is read inside the once-only init effect via a ref so the
  // effect's empty dep array stays honest.
  const groupIdRef = useRef(groupId);
  groupIdRef.current = groupId;
  // Same once-only-effect treatment for onReady: read the latest via a ref
  // so the init/teardown can notify the page without re-binding.
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  // Brush drag state lives in refs so the native zrender mouse handlers
  // (registered once) always read the latest values without re-binding.
  const brushRef = useRef<{ startIdx: number | null; curIdx: number | null }>({
    startIdx: null,
    curIdx: null,
  });
  // Keep the latest props the handlers need without re-creating handlers.
  const cbRef = useRef<{
    onBrushSelect?: (start: Date, end: Date) => void;
    buckets: string[];
    intervalSec: number;
  }>({ onBrushSelect, buckets, intervalSec });
  cbRef.current = { onBrushSelect, buckets, intervalSec };

  // Build the ECharts option. Memoized so we only recompute on real input
  // changes; the brush markArea is layered on separately during a drag.
  const option = useMemo<EChartsCoreOption>(() => {
    const axisLabelColor = cssHsl("--muted-foreground", "#a1a1aa");
    const splitLineColor = cssHsl("--border", "#27272a");

    const echartsSeries = plotSeries.map((s) => {
      // Derived traces ignore the widget's chart type and stacking entirely:
      // always a clean, unstacked line so they read as an overlay on top of
      // the raw series.
      if (s.derived) {
        return {
          id: s.key,
          name: s.label,
          data: s.values,
          type: "line" as const,
          smooth: true,
          showSymbol: false,
          itemStyle: { color: s.color },
          lineStyle: { width: 2, color: s.color },
        };
      }
      const base = {
        id: s.key,
        name: s.label,
        data: s.values,
        itemStyle: { color: s.color },
        ...(stackBase ? { stack: stackBase } : {}),
      };
      if (type === "bar") {
        return {
          ...base,
          type: "bar" as const,
          // Match recharts' rounded top corners.
          itemStyle: { color: s.color, borderRadius: [2, 2, 0, 0] },
        };
      }
      if (type === "line") {
        return {
          ...base,
          type: "line" as const,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2, color: s.color },
        };
      }
      // area
      return {
        ...base,
        type: "line" as const,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2, color: s.color },
        areaStyle: { color: s.color, opacity: 0.25 },
      };
    });

    return {
      animation: false,
      grid: { top: 8, right: 8, bottom: 24, left: 56, containLabel: false },
      tooltip: {
        trigger: "axis",
        // A shared axisPointer is what `echarts.connect` actually syncs
        // across grouped charts (it broadcasts the updateAxisPointer
        // action). Harmless for a standalone chart — it just draws the
        // hover line that the axis-triggered tooltip already implies.
        axisPointer: { type: "line" },
        // ECharts handles dark backgrounds itself; nudge styling toward the
        // shadcn tooltip look.
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
            }>
          )
            .map(
              (p) =>
                `<div style="display:flex;justify-content:space-between;gap:12px">` +
                `<span>${p.marker}${p.seriesName}</span>` +
                `<span style="font-variant-numeric:tabular-nums">${formatCount(
                  p.value,
                )}</span></div>`,
            )
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
      yAxis: {
        type: "value" as const,
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { color: axisLabelColor, formatter: formatCount },
        splitLine: { lineStyle: { color: splitLineColor, type: "dashed" } },
      },
      // Client-side zoom over the category (bucket) axis. Mouse-wheel only:
      // the left-drag is owned by the brush-to-select-timeframe handlers, so
      // we turn off drag-panning (`moveOnMouseMove: false`) to avoid stealing
      // it. Zooming never refetches — it just magnifies the buckets we
      // already have. Because every widget shares the `connect` group,
      // ECharts broadcasts the dataZoom action so all panels zoom together;
      // a standalone chart (no groupId) still zooms, just unsynced.
      dataZoom: [
        {
          id: "__inside_zoom__",
          type: "inside",
          xAxisIndex: 0,
          zoomOnMouseWheel: true,
          moveOnMouseWheel: false,
          moveOnMouseMove: false,
          // Preserve the current zoom window across option pushes (data
          // refreshes) instead of snapping back to the full range.
          // `filterMode: "none"` keeps out-of-window points so lines/areas
          // don't get clipped to abrupt edges.
          filterMode: "none",
        },
      ],
      series: echartsSeries,
    };
  }, [plotSeries, buckets, type, stackBase, intervalSec]);

  // Initialize the instance once.
  useEffect(() => {
    if (!chartRef.current) return;
    const inst = echarts.init(chartRef.current, undefined, {
      renderer: "canvas",
    });
    instanceRef.current = inst;

    // Join the sync group (additive — only when a groupId is provided).
    // `echarts.connect` is idempotent per group id and links axisPointer +
    // tooltip across every instance sharing the group, so hovering one
    // panel draws the cursor on all of them. Reading from the closure is
    // safe: groupId is fixed for the chart's lifetime on the page.
    if (groupIdRef.current) {
      inst.group = groupIdRef.current;
      echarts.connect(groupIdRef.current);
    }

    // Hand the instance to the page so it can drive group-wide dataZoom.
    onReadyRef.current?.(inst);

    const ro = new ResizeObserver(() => inst.resize());
    ro.observe(chartRef.current);

    // --- Brush-to-select-timeframe ---
    // Reproduces the old recharts behavior on canvas: on mousedown we record
    // the bucket under the cursor; on mousemove we draw a translucent
    // markArea highlight between start and current; on mouseup we commit
    // [start, end) — but only if start and current land on *different*
    // buckets (a same-bucket release is a click, not a selection). The end
    // is extended by one bucket width (intervalSec) so the brush includes
    // the bar it visually covers.
    const zr = inst.getZr();

    // Map a pixel x within the grid to the nearest category index. Returns
    // null if the point is outside the plot area.
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
      if (!cbRef.current.onBrushSelect) return;
      const idx = pixelToIndex(event);
      if (idx === null) return;
      brushRef.current = { startIdx: idx, curIdx: idx };
    };
    const onMove = (event: ElementEvent) => {
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
          // Extend `end` to the end of its bucket so a brush that visually
          // covers a bar actually includes that bar's data.
          const end = new Date(new Date(endIso).getTime() + iv * 1000);
          cb(start, end);
        }
      }
    };

    zr.on("mousedown", onDown);
    zr.on("mousemove", onMove);
    zr.on("mouseup", commit);
    // Cancel an in-progress drag if the cursor leaves the canvas — avoids a
    // stuck highlight when the button is released off-chart.
    zr.on("globalout", () => {
      if (brushRef.current.startIdx !== null) {
        brushRef.current = { startIdx: null, curIdx: null };
        renderHighlight();
      }
    });

    return () => {
      ro.disconnect();
      zr.off("mousedown", onDown);
      zr.off("mousemove", onMove);
      zr.off("mouseup", commit);
      onReadyRef.current?.(null);
      inst.dispose();
      instanceRef.current = null;
    };
  }, []);

  // Push option changes. `notMerge: false` so the persistent "__brush__"
  // markArea series isn't clobbered by data updates, but we must include a
  // placeholder brush series so ECharts keeps its id slot stable.
  useEffect(() => {
    const inst = instanceRef.current;
    if (!inst) return;
    // Capture the live zoom window so a `notMerge` rebuild (e.g. a chart-type
    // toggle) doesn't snap the view back to the full range. Pure zoom
    // interactions don't run this effect — `option` is referentially stable
    // unless real inputs change — so this only matters on data/type updates.
    // `getOption()` returns undefined until the first `setOption`, so guard
    // it — on the initial mount there's no prior zoom window to preserve.
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

  // Always keep the chart container (and its ref) mounted so the one-time
  // init effect has a node even when the first render has no data — the
  // empty state is an overlay, not an early return. Otherwise a mount with
  // empty series followed by data arriving would never initialize the
  // instance (the `[]`-deps effect won't re-run). The empty overlay sits on
  // top of an empty canvas.
  return (
    <div className="relative h-[260px] w-full">
      <div
        ref={chartRef}
        className="h-full w-full"
        style={
          onBrushSelect
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

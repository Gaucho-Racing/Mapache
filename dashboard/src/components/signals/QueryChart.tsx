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
import type { FillMode } from "@/lib/query";

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

/** Per-trace y-scaling behavior (T8), keyed by `seriesLabel(tags)` in the
 *  widget's settings map. Two mutually-exclusive modes:
 *   - native: the trace plots on the real-value axis for `axisGroup`; every
 *     trace sharing a group shares one axis and keeps its true relative
 *     height (not rescaled against the others).
 *   - normalize: the trace is min/max-rescaled to [0,1] onto a shared hidden
 *     axis so its peak reaches the top of the plot regardless of magnitude.
 *  Default for any unconfigured label = group "1", un-normalized → today's
 *  exact single-axis behavior.
 *
 *  `hidden` (T11) drops the trace from the chart while it stays fetched, so a
 *  signal needed only to feed a derived trace or highlight condition can be
 *  kept out of the plot. The chart never sees hidden series (the widget filters
 *  them before passing `series`); this flag lives here only so it persists in
 *  the same per-label settings map as the scaling choices. */
export interface AxisSetting {
  axisGroup: string;
  normalize: boolean;
  hidden?: boolean;
}

interface QueryChartProps {
  series: Series[];
  /** Time-series renderings only — the non-time chart types are PlotChart's. */
  type: Extract<ChartType, "bar" | "line" | "area">;
  /** Number of seconds per bucket — drives the x-axis tick formatting. */
  intervalSec: number;
  /** Max series shown before everything beyond gets rolled into "other".
   *  Past ~12 the legend stops being useful. */
  maxSeries?: number;
  /** If set, click-and-drag on the chart highlights a range and commits
   *  it on mouse-up. Receives the [start, end) of the brushed window. */
  onBrushSelect?: (start: Date, end: Date) => void;
  /** Left-drag gesture mode. "select" (default) is the brush-to-select
   *  timeframe behavior; "pan" hands left-drag to the inside dataZoom so the
   *  user slides the zoom window instead. Wheel-zoom works in both. The mode
   *  is read live by the once-registered zrender handlers via a ref, so
   *  toggling never re-inits the chart. */
  interactionMode?: "select" | "pan";
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
  /** Per-series y-scaling settings (T8), keyed by series label. Sparse —
   *  any label absent here falls back to the default (group "1", native).
   *  When every plotted label is default, the chart collapses to exactly its
   *  prior single-axis, single-stack rendering. */
  axisConfig?: Record<string, AxisSetting>;
  /** Highlight bands (T6): translucent vertical regions over the bucket index
   *  ranges where a per-widget condition holds. Each range is an inclusive
   *  `[loIdx, hiIdx]` over the shared category axis. Rendered as a dedicated,
   *  silent `__highlight__` markArea series that sits behind the data and never
   *  interferes with the transient `__brush__` selection. Absent/empty → the
   *  chart renders exactly as today. */
  highlights?: { id: string; color: string; ranges: [number, number][] }[];
  /** Per-series null-gap fill mode (W4), keyed by series label (like
   *  `axisConfig`). Sparse — any label absent here uses the default "gap"
   *  (nulls stay null and the line/area breaks at the gap). Only the *plotted*
   *  data honors fill; ranking/top-K and the tooltip's true values are
   *  unaffected, and CSV/JSON export reads the raw series, never this. */
  fillConfig?: Record<string, FillMode>;
}

// Stable, high-contrast palette. Datadog-ish saturated colors that survive
// dark backgrounds — first slot deliberately matches our existing gr-pink
// so single-series bars don't change color when you flip into multi-series.
export const PALETTE = [
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

/** Map each plotted series' label to the palette color the chart actually
 *  renders it with — applying the SAME top-K reordering used below — so
 *  external UI (the axis-controls swatches) matches the on-screen line
 *  colors. Series folded into the "+N other" rollup aren't individually
 *  colored and are omitted; callers should fall back to a neutral swatch. */
export function seriesColorMap(
  series: Series[],
  maxSeries = 10,
): Map<string, string> {
  const { kept } = topK(series, maxSeries);
  const map = new Map<string, string>();
  kept.forEach((s, i) => {
    // The synthetic "+N other" series isn't a configurable trace — skip it,
    // but keep `i` so every real series keeps its rendered color index.
    if (OTHER_KEY in s.tags) return;
    map.set(seriesLabel(s.tags), PALETTE[i % PALETTE.length]);
  });
  return map;
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

/** Default y-scaling for an unconfigured series label — a single shared
 *  native group, never normalized. Keeping this in one place guarantees the
 *  "zero config behaves exactly as today" contract. */
function settingFor(
  axisConfig: Record<string, AxisSetting> | undefined,
  label: string,
): AxisSetting {
  return axisConfig?.[label] ?? { axisGroup: "1", normalize: false };
}

/** Default fill for an unconfigured series label — "gap" (nulls break the
 *  line). Keeps the "no fill config behaves like a clean gap" contract in one
 *  place. */
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
  // Top-K rollup before any other shaping; bar/area would stack hundreds
  // of slivers otherwise.
  const { kept } = useMemo(() => topK(series, maxSeries), [series, maxSeries]);

  // Shape into the columnar form ECharts wants: a shared category axis of
  // bucket ISO strings plus one value array per series. Series keys mirror
  // the old "s0", "s1", ... indexing so colors stay stable by position.
  const { buckets, plotSeries } = useMemo(() => {
    const buckets = kept[0]?.points.map((p) => p.bucket) ?? [];
    const plotSeries = kept.map((s, i) => {
      const label = seriesLabel(s.tags);
      const setting = settingFor(axisConfig, label);
      const derived = isDerived(s);
      const fill = fillFor(fillConfig, label);
      // True per-bucket values, NULLS PRESERVED (W4). Backend now emits null
      // for non-count aggregators at empty buckets; we no longer coerce those
      // to 0 here (the old recharts-era `?? 0` made phantom troughs). Derived
      // traces keep their own null handling (their points carry real nulls
      // already); we route them through the same array and a "gap" fill so a
      // div-by-zero gap breaks the line cleanly.
      const trueVals = buckets.map((_, bi) => s.points[bi]?.value ?? null);
      // The data array actually plotted, honoring the series' fill mode:
      //   gap    → keep nulls; the line breaks (connectNulls:false).
      //   last   → forward-fill nulls with the previous non-null (leading
      //            nulls stay null until the first real sample).
      //   linear → keep nulls but let ECharts bridge them (connectNulls:true).
      // Derived traces are always treated as "gap" (explicit overlay lines).
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
        // gap and linear both keep nulls in the data; they differ only in
        // connectNulls (set below on the echarts series).
        data = trueVals;
      }
      return {
        key: `s${i}`,
        label,
        color: PALETTE[i % PALETTE.length],
        // Derived/expression traces render as standalone lines and never join
        // the stacked bar/area group (a series and its square stacking on top
        // of each other would be misleading).
        derived,
        normalize: setting.normalize,
        axisGroup: setting.axisGroup,
        // connectNulls only matters for "linear" — gap/last leave gaps where
        // their data array still carries nulls.
        connectNulls: effFill === "linear",
        // The fill-resolved values used for native plotting; tooltip recovers
        // true values from this directly (nulls render as no-data).
        raw: data,
      };
    });
    return { buckets, plotSeries };
  }, [kept, axisConfig, fillConfig]);

  // Distinct native (un-normalized) axis groups, in first-seen order. The
  // first group renders on the left with split lines; any additional groups
  // get an independent scale drawn on the right (color-matched, no split
  // lines) — see the yAxis builder. A separate hidden [0,1] axis is appended
  // for normalized traces when any exist. This collapses to a single left
  // y-axis when nothing is grouped or normalized, preserving today's rendering
  // exactly.
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
    // Guarantee at least one native axis even if every series is normalized,
    // so the grid always has a y-axis to render against.
    if (order.length === 0) order.push("1");
    return { nativeGroups: order, hasNormalized: anyNorm };
  }, [plotSeries]);

  // The hidden normalized axis (if present) sits after every native axis.
  const normalizedAxisIndex = hasNormalized ? nativeGroups.length : -1;

  // Stacking only makes sense within ONE shared native axis. To stay simple
  // and safe we only stack when ALL base (non-derived, non-normalized) series
  // live in a single native group; any grouping or normalization splits the
  // scales and we fall back to unstacked. (Stacking across independent scales
  // would be visually meaningless, and normalized traces never stack.)
  const stackableBase = plotSeries.filter((s) => !s.derived && !s.normalize);
  const singleNativeGroup =
    stackableBase.length > 0 &&
    stackableBase.every((s) => s.axisGroup === stackableBase[0].axisGroup);
  const stackBase =
    stackableBase.length > 1 && singleNativeGroup && type !== "line"
      ? "stack"
      : undefined;

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
    interactionMode: "select" | "pan";
  }>({ onBrushSelect, buckets, intervalSec, interactionMode });
  cbRef.current = { onBrushSelect, buckets, intervalSec, interactionMode };

  // Build the ECharts option. Memoized so we only recompute on real input
  // changes; the brush markArea is layered on separately during a drag.
  const option = useMemo<EChartsCoreOption>(() => {
    const axisLabelColor = cssHsl("--muted-foreground", "#a1a1aa");
    const splitLineColor = cssHsl("--border", "#27272a");

    // Color each native axis to its group's trace. Walk the plotted series in
    // render order and record the color of the FIRST native series bound to
    // each group, so every axis matches the line/bar it scales. Series carry
    // their rendered palette color on `s.color` (PALETTE[i] from plotSeries),
    // so we reuse exactly the on-screen colors — no separate scheme.
    const groupColor = new Map<string, string>();
    for (const s of plotSeries) {
      if (s.normalize) continue;
      if (!groupColor.has(s.axisGroup)) groupColor.set(s.axisGroup, s.color);
    }
    // Number of native axes beyond the first — these render on the right and
    // each claim a 48px-wide gutter, so the grid's right margin must grow to
    // keep their labels from clipping. Zero extra axes → today's `right: 8`.
    const rightAxisCount = Math.max(0, nativeGroups.length - 1);

    const echartsSeries = plotSeries.map((s) => {
      // Resolve which y-axis this series binds to, and the data it actually
      // plots. Native series plot raw numbers on their group's axis. A
      // normalized series is min/max-rescaled to [0,1] on the hidden
      // normalized axis, emitting `{ value, raw }` objects so the tooltip can
      // still recover the true value (see the tooltip formatter below).
      const yAxisIndex = s.normalize
        ? normalizedAxisIndex
        : nativeGroups.indexOf(s.axisGroup);
      // `s.raw` now carries the fill-resolved values with nulls preserved
      // (W4). Native series plot it directly; nulls render as no-data so the
      // tooltip shows nothing for them.
      let data: Array<number | { value: number; raw: number } | null> = s.raw;
      if (s.normalize) {
        // Min/max must IGNORE nulls so a gap doesn't drag the scale to 0.
        let min = Infinity;
        let max = -Infinity;
        for (const v of s.raw) {
          if (v === null) continue;
          if (v < min) min = v;
          if (v > max) max = v;
        }
        const span = max - min;
        data = s.raw.map((v) =>
          // Nulls stay null through the rescale so gaps survive normalization.
          v === null
            ? null
            : {
                // When the trace is flat (max === min) the [0,1] rescale is
                // undefined; park it mid-plot (0.5) so a constant line is
                // visible rather than pinned to an edge. Otherwise standard
                // min/max scaling.
                value: span === 0 ? 0.5 : (v - min) / span,
                raw: v,
              },
        );
      }

      // Derived traces ignore the widget's chart type and stacking entirely:
      // always a clean, unstacked line so they read as an overlay on top of
      // the raw series.
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

    // Highlight bands (T6) live on their own dedicated, silent series id —
    // `__highlight__` — kept entirely separate from the transient `__brush__`
    // markArea so brush-to-select and condition bands never clobber each other.
    // Each `[lo, hi]` index range becomes one markArea band; every range across
    // every highlight is flattened into this single series' data, each carrying
    // its own translucent color via per-item `itemStyle`. With no highlights the
    // series carries empty data and is visually inert. `silent: true` keeps it
    // from intercepting the zrender brush mouse handlers, and `z: 0` parks it
    // behind the data lines/bars.
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
        // Default color is a no-op — every band overrides it per-item above —
        // but ECharts wants an itemStyle present.
        itemStyle: { color: "transparent" },
        data: highlightAreas,
      },
    };

    return {
      animation: false,
      grid: {
        top: 8,
        // Grow the right margin for each extra native axis (each stacks
        // outward in a 48px gutter) so right-side labels aren't clipped.
        // Exactly 8 when there are no extra axes — today's layout.
        right: 8 + rightAxisCount * 48,
        bottom: 24,
        left: 56,
        containLabel: false,
      },
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
              // Normalized series emit `{ value, raw }` objects; `data` carries
              // the true (un-rescaled) value so the tooltip never shows the
              // display-scaled number.
              data: number | { value: number; raw: number } | null;
            }>
          )
            .map((p) => {
              // Null buckets (real gaps under "gap"/"linear" fill, or a
              // forward-fill's leading nulls) show as no-data rather than a
              // misleading 0. `p.value`/`p.data` is null at those buckets.
              const isNull =
                p.data === null || p.value === null || p.value === undefined;
              const trueValue =
                p.data !== null &&
                typeof p.data === "object" &&
                "raw" in p.data
                  ? p.data.raw
                  : p.value;
              const shown = isNull ? "—" : formatCount(trueValue);
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
      // One value axis per native group plus (when needed) a hidden [0,1]
      // axis for normalized traces. EVERY native axis is now drawn and
      // color-matched to its group's trace: the FIRST (index 0) stays on the
      // LEFT with horizontal split lines — pixel-identical to today when
      // there's only one group. Each additional native axis goes on the RIGHT,
      // stacked outward by 48px (`offset`), with its own labels + axis line but
      // NO split lines, so only the primary axis draws the horizontal grid
      // (avoiding competing tick grids). With no grouping/normalization this is
      // a single-element array identical to the old single `yAxis`.
      yAxis: [
        ...nativeGroups.map((g, gi) => {
          const primary = gi === 0;
          // When multiple native groups exist, color the left axis too so all
          // axes read as consistently color-coded; with a single group fall
          // back to today's muted color for a pixel-identical render.
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
              axisLabel: { color, formatter: formatCount },
              splitLine: { lineStyle: { color: splitLineColor, type: "dashed" } },
            };
          }
          return {
            type: "value" as const,
            position: "right" as const,
            // 2nd axis sits flush right (offset 0), 3rd steps out 48px, etc.
            offset: (gi - 1) * 48,
            axisTick: { show: false },
            axisLine: { show: true, lineStyle: { color } },
            axisLabel: { color, formatter: formatCount },
            splitLine: { show: false },
          };
        }),
        ...(hasNormalized
          ? [
              {
                // Shared normalized axis: fixed [0,1] so every normalized
                // trace's own max pins to the top of the plot. Fully hidden —
                // its tick values are meaningless next to native units.
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
          // Left-drag pans the zoom window only in pan mode; in select mode the
          // zrender brush owns left-drag, so drag-panning stays off. Wheel-zoom
          // (`zoomOnMouseWheel`) is unaffected and works in both modes. The
          // dataZoom action broadcasts across the `connect` group, so panning
          // one panel slides all of them in lockstep.
          moveOnMouseMove: interactionMode === "pan",
          // Preserve the current zoom window across option pushes (data
          // refreshes) instead of snapping back to the full range.
          // `filterMode: "none"` keeps out-of-window points so lines/areas
          // don't get clipped to abrupt edges.
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
    interactionMode,
  ]);

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
      // In pan mode the inside dataZoom owns left-drag (moveOnMouseMove);
      // the brush stands down so a drag slides the window instead of
      // selecting a range.
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

  // Switching into pan mid-drag would otherwise strand the brush state and its
  // translucent markArea on screen. Reset the drag refs and clear the
  // transient `__brush__` band so the gesture can't leak across modes. (The
  // option rebuild already redraws an empty brush series, but a drag in flight
  // when the toggle flips needs its in-memory state cleared too.)
  useEffect(() => {
    if (interactionMode !== "pan") return;
    brushRef.current = { startIdx: null, curIdx: null };
    const inst = instanceRef.current;
    if (!inst) return;
    inst.setOption({ series: [{ id: "__brush__", markArea: { data: [] } }] });
  }, [interactionMode]);

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

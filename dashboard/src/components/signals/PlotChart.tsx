import * as echarts from "echarts/core";
import { ScatterChart, LineChart, PieChart, BarChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  VisualMapComponent,
  LegendComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
// echarts-gl 2.x ships tree-shakeable install modules (`{ install }`) that
// plug into `echarts.use(...)`. Importing the granular paths keeps the common
// 2D bundle from pulling the whole GL chart in. No bundled types — declared in
// `echarts-gl.d.ts`.
import { install as Scatter3DChart } from "echarts-gl/lib/chart/scatter3D/install";
import { install as Grid3DComponent } from "echarts-gl/lib/component/grid3D/install";
import type { ECharts, EChartsCoreOption } from "echarts/core";
import { useEffect, useMemo, useRef } from "react";
import { PALETTE, seriesLabel, type Series } from "./QueryChart";
import type { PairRow, PairsResponse } from "@/lib/pairs";
import type { ChartType } from "@/components/signals/chartTypes";

// Register everything the non-time plots need. Kept in this file's own
// `echarts.use(...)` so it never disturbs QueryChart's (Bar/Line) registration
// — both call `use` against the same shared core registry, which is additive
// and idempotent.
echarts.use([
  ScatterChart,
  LineChart,
  PieChart,
  BarChart,
  GridComponent,
  TooltipComponent,
  VisualMapComponent,
  LegendComponent,
  Scatter3DChart,
  Grid3DComponent,
  CanvasRenderer,
]);

/** The subset of chart types this renderer handles — the non-time-series ones.
 *  (Time-series bar/line/area are rendered by QueryChart instead.) */
export type PlotKind = Extract<
  ChartType,
  "scatter" | "path" | "scatter3d" | "catbar" | "pie"
>;

/** Sparse config driving the chart. Which fields matter depends on `kind`:
 *  - scatter/path: xSignal + ySignals (one or more), optional colorBy.
 *  - scatter3d: xSignal + ySignals[0] (y) + zSignal (z).
 *  - catbar/pie: neither — those read the categorical `/query/run` series. */
export interface PlotConfig {
  kind: PlotKind;
  xSignal?: string;
  ySignals: string[];
  zSignal?: string;
  /** "time" colors points along the row order (time), or a signal name colors
   *  by that signal's value. Only meaningful for scatter/path. */
  colorBy?: "time" | string;
}

/** Resolve an HSL CSS custom property (stored as "H S% L%") to an `hsl(...)`
 *  string ECharts can consume. Mirrors QueryChart.cssHsl — duplicated rather
 *  than exported to keep that file's surface unchanged. */
function cssHsl(varName: string, fallback: string, alpha = 1): string {
  if (typeof window === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  if (!raw) return fallback;
  return alpha === 1 ? `hsl(${raw})` : `hsl(${raw} / ${alpha})`;
}

function num(row: PairRow, name: string | undefined): number | null {
  if (!name) return null;
  const v = row[name];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

interface PlotChartProps {
  config: PlotConfig;
  /** Aligned XY/XYZ rows from /query/pairs — used by scatter/path/scatter3d. */
  pairs: PairsResponse;
  /** Categorical aggregate series from /query/run — used by bar/pie. Each
   *  series is one group; its value is the sum of its points. */
  categorical: Series[];
  onReady?: (instance: ECharts | null) => void;
}

/** Sum every point in a categorical series — the aggregate value for its
 *  bar/slice. Mirrors how the time chart totals a series. */
function seriesTotal(s: Series): number {
  let acc = 0;
  for (const p of s.points) acc += p.value ?? 0;
  return acc;
}

export function PlotChart({
  config,
  pairs,
  categorical,
  onReady,
}: PlotChartProps) {
  const option = useMemo<EChartsCoreOption>(() => {
    const axisLabelColor = cssHsl("--muted-foreground", "#a1a1aa");
    const splitLineColor = cssHsl("--border", "#27272a");
    const popoverBg = cssHsl("--popover", "#18181b");
    const popoverFg = cssHsl("--popover-foreground", "#fafafa");

    const baseTooltip = {
      backgroundColor: popoverBg,
      borderColor: splitLineColor,
      textStyle: { color: popoverFg },
    };

    // --- catbar / pie: categorical aggregates from /query/run ---
    if (config.kind === "catbar" || config.kind === "pie") {
      const entries = categorical
        .map((s) => ({ name: seriesLabel(s.tags), value: seriesTotal(s) }))
        .filter((e) => Number.isFinite(e.value));

      if (config.kind === "pie") {
        return {
          animation: false,
          tooltip: { trigger: "item", ...baseTooltip },
          legend: {
            type: "scroll",
            bottom: 0,
            textStyle: { color: axisLabelColor },
          },
          series: [
            {
              type: "pie",
              radius: ["35%", "70%"],
              center: ["50%", "45%"],
              data: entries.map((e, i) => ({
                ...e,
                itemStyle: { color: PALETTE[i % PALETTE.length] },
              })),
              label: { color: axisLabelColor },
            },
          ],
        };
      }
      // bar
      return {
        animation: false,
        tooltip: { trigger: "axis", ...baseTooltip },
        grid: { top: 16, right: 16, bottom: 48, left: 56, containLabel: true },
        xAxis: {
          type: "category",
          data: entries.map((e) => e.name),
          axisTick: { show: false },
          axisLine: { show: false },
          axisLabel: { color: axisLabelColor, hideOverlap: true, rotate: 30 },
        },
        yAxis: {
          type: "value",
          axisTick: { show: false },
          axisLine: { show: false },
          axisLabel: { color: axisLabelColor },
          splitLine: { lineStyle: { color: splitLineColor, type: "dashed" } },
        },
        series: [
          {
            type: "bar",
            data: entries.map((e, i) => ({
              value: e.value,
              itemStyle: {
                color: PALETTE[i % PALETTE.length],
                borderRadius: [2, 2, 0, 0],
              },
            })),
          },
        ],
      };
    }

    // --- scatter3d: X/Y/Z from /query/pairs ---
    if (config.kind === "scatter3d") {
      const x = config.xSignal;
      const y = config.ySignals[0];
      const z = config.zSignal;
      const data = pairs.rows
        .map((r) => [num(r, x), num(r, y), num(r, z)])
        .filter(
          (p): p is [number, number, number] =>
            p[0] !== null && p[1] !== null && p[2] !== null,
        );
      return {
        animation: false,
        tooltip: { ...baseTooltip },
        xAxis3D: { name: x, type: "value" },
        yAxis3D: { name: y, type: "value" },
        zAxis3D: { name: z, type: "value" },
        grid3D: {
          axisLabel: { textStyle: { color: axisLabelColor } },
          axisLine: { lineStyle: { color: splitLineColor } },
        },
        series: [
          {
            type: "scatter3D",
            data,
            symbolSize: 6,
            itemStyle: { color: PALETTE[0], opacity: 0.85 },
          },
        ],
      };
    }

    // --- scatter / path: XY from /query/pairs ---
    const x = config.xSignal;
    // For each Y signal build a series of [x, y] pairs (path keeps time order,
    // scatter is unordered points). colorBy adds a visualMap over a 3rd dim.
    const colorBy = config.colorBy;
    const colorBySignal =
      colorBy && colorBy !== "time" ? colorBy : undefined;

    // When coloring by time we tag each point with its row index (a proxy for
    // time, since rows arrive in produced_at order); by a signal we tag it with
    // that signal's value. The visualMap reads the 3rd array element.
    const colorDim = colorBy ? 2 : undefined;

    const series = config.ySignals.map((ySig, si) => {
      const pts: number[][] = [];
      pairs.rows.forEach((r, ri) => {
        const xv = num(r, x);
        const yv = num(r, ySig);
        if (xv === null || yv === null) return;
        if (colorBy === "time") pts.push([xv, yv, ri]);
        else if (colorBySignal) {
          const cv = num(r, colorBySignal);
          if (cv === null) return;
          pts.push([xv, yv, cv]);
        } else pts.push([xv, yv]);
      });
      const color = PALETTE[si % PALETTE.length];
      if (config.kind === "path") {
        return {
          name: ySig,
          type: "line" as const,
          data: pts,
          showSymbol: false,
          smooth: false,
          lineStyle: { width: 1.5, color },
          itemStyle: { color },
        };
      }
      return {
        name: ySig,
        type: "scatter" as const,
        data: pts,
        symbolSize: 5,
        itemStyle: { color, opacity: 0.7 },
      };
    });

    // Color range for the visualMap, computed over every plotted point's color
    // dimension across all series.
    let cMin = Infinity;
    let cMax = -Infinity;
    if (colorDim !== undefined) {
      for (const s of series) {
        for (const p of s.data) {
          const c = p[colorDim];
          if (typeof c === "number") {
            if (c < cMin) cMin = c;
            if (c > cMax) cMax = c;
          }
        }
      }
    }
    const hasColor = colorDim !== undefined && cMin <= cMax;

    return {
      animation: false,
      tooltip: { trigger: "item", ...baseTooltip },
      grid: { top: 16, right: hasColor ? 72 : 16, bottom: 40, left: 56 },
      xAxis: {
        type: "value",
        name: x,
        nameLocation: "middle",
        nameGap: 26,
        nameTextStyle: { color: axisLabelColor },
        scale: true,
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { color: axisLabelColor },
        splitLine: { lineStyle: { color: splitLineColor, type: "dashed" } },
      },
      yAxis: {
        type: "value",
        scale: true,
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { color: axisLabelColor },
        splitLine: { lineStyle: { color: splitLineColor, type: "dashed" } },
      },
      ...(hasColor
        ? {
            visualMap: {
              type: "continuous" as const,
              dimension: colorDim,
              min: cMin,
              max: cMax,
              calculable: true,
              right: 8,
              top: "center",
              text: [colorBySignal ?? "late", colorBySignal ? "" : "early"],
              textStyle: { color: axisLabelColor },
              inRange: {
                color: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"],
              },
            },
          }
        : {}),
      series,
    };
  }, [config, pairs, categorical]);

  const chartRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<ECharts | null>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    if (!chartRef.current) return;
    const inst = echarts.init(chartRef.current, undefined, {
      renderer: "canvas",
    });
    instanceRef.current = inst;
    onReadyRef.current?.(inst);
    const ro = new ResizeObserver(() => inst.resize());
    ro.observe(chartRef.current);
    return () => {
      ro.disconnect();
      onReadyRef.current?.(null);
      inst.dispose();
      instanceRef.current = null;
    };
  }, []);

  // notMerge: true so switching plot kinds (e.g. scatter → pie, which swaps the
  // whole axis/series model) never leaves stale components behind.
  useEffect(() => {
    const inst = instanceRef.current;
    if (!inst) return;
    inst.setOption(option, { notMerge: true });
  }, [option]);

  return <div ref={chartRef} className="h-[320px] w-full" />;
}

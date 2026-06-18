import { useEffect, useMemo, useRef } from "react";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsCoreOption } from "echarts/core";
import { SignalSample } from "@/models/session";
import { PALETTE, cssHsl } from "@/lib/echartsTheme";
import { useEchartInstance } from "@/lib/useEchartInstance";

// Additive + idempotent against the shared core registry, matching QueryChart /
// PlotChart so this never disturbs their registrations.
echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  CanvasRenderer,
]);

interface SignalTimeChartProps {
  samples: SignalSample[];
  signals: string[];
  cropStartTs: number;
  cropEndTs: number;
  // When true, each signal is min/max scaled to 0-1 so signals with different
  // ranges are comparable; raw values are still shown in the tooltip.
  normalized: boolean;
}

// Per-signal min/max, used both to normalize and to recover raw values.
function signalRanges(samples: SignalSample[], signals: string[]) {
  const ranges: Record<string, { min: number; max: number }> = {};
  for (const sig of signals) {
    let min = Infinity;
    let max = -Infinity;
    for (const s of samples) {
      const v = s[sig];
      if (v == null || Number.isNaN(v)) continue;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    ranges[sig] = { min, max };
  }
  return ranges;
}

// One ECharts datum carrying both the plotted (possibly normalized) value at a
// timestamp and the raw value, so the tooltip recovers the true reading.
type Datum = { value: [number, number]; raw: number };

export default function SignalTimeChart({
  samples,
  signals,
  cropStartTs,
  cropEndTs,
  normalized,
}: SignalTimeChartProps) {
  const ranges = useMemo(
    () => signalRanges(samples, signals),
    [samples, signals],
  );

  // One [ts, value] series per signal. The plotted value is normalized to 0-1
  // when requested; the raw value rides along on each datum for the tooltip.
  // Null/NaN readings are dropped (matching the Recharts version, which skipped
  // assigning the key) so a gap renders as no-data rather than a 0-trough.
  const series = useMemo(() => {
    return signals.map((sig, i) => {
      const color = PALETTE[i % PALETTE.length];
      const { min, max } = ranges[sig] ?? { min: Infinity, max: -Infinity };
      const span = max - min;
      const data: Datum[] = [];
      for (const s of samples) {
        const v = s[sig];
        if (v == null || Number.isNaN(v)) continue;
        const plotted = normalized ? (span > 0 ? (v - min) / span : 0) : v;
        data.push({ value: [s.ts, plotted], raw: v });
      }
      return {
        name: sig,
        type: "line" as const,
        data,
        smooth: true,
        showSymbol: false,
        itemStyle: { color },
        lineStyle: { width: 2, color },
      };
    });
  }, [samples, signals, normalized, ranges]);

  // Full data extent in ts (epoch seconds), mirroring Recharts' dataMin/dataMax
  // for the crop-shading markArea.
  const { tsMin, tsMax } = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const s of samples) {
      if (s.ts < lo) lo = s.ts;
      if (s.ts > hi) hi = s.ts;
    }
    return { tsMin: lo, tsMax: hi };
  }, [samples]);

  const chartRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useEchartInstance(chartRef);

  const option = useMemo<EChartsCoreOption>(() => {
    const axisLabelColor = cssHsl("--muted-foreground", "#a1a1aa");
    const splitLineColor = cssHsl("--border", "#27272a");

    // Crop shading: dim the trimmed-out regions on either side of the window.
    // Carried on the first series' markArea (silent so it never steals hover).
    const cropShade =
      Number.isFinite(tsMin) && Number.isFinite(tsMax)
        ? [
            [{ xAxis: tsMin }, { xAxis: cropStartTs }],
            [{ xAxis: cropEndTs }, { xAxis: tsMax }],
          ]
        : [];

    return {
      animation: false,
      grid: { top: 32, right: 12, bottom: 24, left: 44, containLabel: true },
      legend: {
        type: "scroll",
        textStyle: { color: axisLabelColor },
        top: 0,
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "line" },
        backgroundColor: cssHsl("--popover", "#18181b"),
        borderColor: splitLineColor,
        textStyle: { color: cssHsl("--popover-foreground", "#fafafa") },
        formatter: (params: unknown) => {
          const arr = Array.isArray(params) ? params : [params];
          if (arr.length === 0) return "";
          const first = arr[0] as { axisValue?: number };
          const ts = first.axisValue;
          const header =
            ts != null ? new Date(ts * 1000).toLocaleString() : "";
          const rows = (
            arr as Array<{
              seriesName: string;
              marker: string;
              data?: Datum;
            }>
          )
            .map((p) => {
              const raw = p.data?.raw;
              const shown = raw == null ? "—" : Number(raw).toPrecision(5);
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
        type: "value" as const,
        min: "dataMin",
        max: "dataMax",
        axisTick: { show: false },
        axisLabel: {
          color: axisLabelColor,
          hideOverlap: true,
          formatter: (v: number) => new Date(v * 1000).toLocaleTimeString(),
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: "value" as const,
        ...(normalized ? { min: 0, max: 1 } : {}),
        axisTick: { show: false },
        axisLabel: { color: axisLabelColor },
        splitLine: { lineStyle: { color: splitLineColor, type: "dashed" } },
      },
      series: series.map((s, i) =>
        i === 0
          ? {
              ...s,
              markArea: {
                silent: true,
                itemStyle: { color: "#000", opacity: 0.35 },
                data: cropShade,
              },
              markLine: {
                silent: true,
                symbol: "none",
                data: [
                  {
                    xAxis: cropStartTs,
                    lineStyle: { color: "#a855f7", type: "dashed" },
                  },
                  {
                    xAxis: cropEndTs,
                    lineStyle: { color: "#ec4899", type: "dashed" },
                  },
                ],
              },
            }
          : s,
      ),
    };
  }, [series, normalized, tsMin, tsMax, cropStartTs, cropEndTs]);

  useEffect(() => {
    const inst = instanceRef.current;
    if (!inst) return;
    inst.setOption(option, { notMerge: true });
  }, [option, instanceRef]);

  // Empty states are overlays (not early returns) so the once-only init effect
  // in useEchartInstance always has a node to mount, matching QueryChart.
  const emptyMessage =
    signals.length === 0
      ? "Select one or more signals to plot vs. time."
      : samples.length === 0
        ? "No data for the selected signals."
        : null;

  return (
    <div className="relative h-full w-full p-4">
      <div ref={chartRef} className="h-full w-full" />
      {emptyMessage && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      )}
    </div>
  );
}

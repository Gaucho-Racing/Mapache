import * as echarts from "echarts/core";
import { ScatterChart, LineChart, PieChart, BarChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  GraphicComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
// Granular echarts-gl install paths keep the 2D bundle from pulling in the
// whole GL chart. Types declared in `echarts-gl.d.ts`.
import { install as Scatter3DChart } from "echarts-gl/lib/chart/scatter3D/install";
import { install as Grid3DComponent } from "echarts-gl/lib/component/grid3D/install";
import type { ECharts, EChartsCoreOption } from "echarts/core";
import { useEffect, useMemo, useRef } from "react";
import { seriesLabel, type Series } from "./QueryChart";
import { PALETTE, cssHsl, seriesTotal } from "@/lib/echartsTheme";
import type { PairRow, PairsResponse } from "@/lib/pairs";
import type { ChartType } from "@/components/signals/chartTypes";
import { MAPBOX_ACCESS_TOKEN } from "@/consts/config";

// Additive + idempotent against the shared core registry, so this never
// disturbs QueryChart's registration.
echarts.use([
  ScatterChart,
  LineChart,
  PieChart,
  BarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  GraphicComponent,
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
 *  - scatter/path: xSignal + ySignals (one or more).
 *  - scatter3d: xSignal + ySignals[0] (y) + zSignal (z).
 *  - catbar/pie: neither — those read the categorical `/query/run` series. */
export interface PlotConfig {
  kind: PlotKind;
  xSignal?: string;
  ySignals: string[];
  zSignal?: string;
}

// Match a lat/lon token anywhere in the signal name (e.g. "latitude",
// "mobile_latitude", "gps_lat_deg") without tripping on words like "lateral".
const isLatSignal = (name: string | undefined): boolean =>
  !!name && /(^|[_\s-])lat(itude)?([_\s-]|$)/i.test(name);
const isLonSignal = (name: string | undefined): boolean =>
  !!name && /(^|[_\s-])lon(g(itude)?)?([_\s-]|$)/i.test(name);

/** True when a scatter/path plot maps a single lon-X / lat-Y signal pair, i.e.
 *  it's plotting a GPS track and a Mapbox basemap can be aligned behind it. */
export function isGpsLikePlot(config: PlotConfig): boolean {
  if (config.kind !== "scatter" && config.kind !== "path") return false;
  if (config.ySignals.length !== 1) return false;
  const a = config.xSignal;
  const b = config.ySignals[0];
  return (
    (isLonSignal(a) && isLatSignal(b)) || (isLatSignal(a) && isLonSignal(b))
  );
}

const MAPBOX_MAX_DIM = 1280;
const MAPBOX_STREETS_STYLE = "mapbox/streets-v12";

/** Mapbox Static Images for a geographic bbox; matching the image aspect ratio
 *  to the bbox keeps Mapbox from expanding it to fill a mismatched canvas. */
function staticImageUrl(
  bounds: { minLon: number; maxLon: number; minLat: number; maxLat: number },
  w: number,
  h: number,
): string {
  const W = Math.max(1, Math.min(MAPBOX_MAX_DIM, Math.round(w)));
  const H = Math.max(1, Math.min(MAPBOX_MAX_DIM, Math.round(h)));
  const bbox = `[${bounds.minLon},${bounds.minLat},${bounds.maxLon},${bounds.maxLat}]`;
  return `https://api.mapbox.com/styles/v1/${MAPBOX_STREETS_STYLE}/static/${bbox}/${W}x${H}@2x?access_token=${MAPBOX_ACCESS_TOKEN}&attribution=false&logo=false`;
}

// Add/update the basemap image graphic over the grid rect (merge-only; never
// issues a remove — the option effect's notMerge clears it when not wanted).
function placeBasemap(
  inst: ECharts,
  bbox: { minLon: number; maxLon: number; minLat: number; maxLat: number },
): void {
  const tl = inst.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [
    bbox.minLon,
    bbox.maxLat,
  ]) as [number, number] | undefined;
  const br = inst.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [
    bbox.maxLon,
    bbox.minLat,
  ]) as [number, number] | undefined;
  if (!tl || !br) return;
  const left = tl[0];
  const top = tl[1];
  const width = br[0] - tl[0];
  const height = br[1] - tl[1];
  if (!(width > 0) || !(height > 0)) return;
  inst.setOption({
    graphic: [
      {
        id: "__basemap__",
        type: "image",
        z: -10,
        left,
        top,
        style: { image: staticImageUrl(bbox, width, height), width, height },
      },
    ],
  });
}

/** Pad a lon/lat bbox so its aspect ratio matches the pixel rect, growing the
 *  short axis symmetrically. This is what makes the static image line up with
 *  the locked axis bounds. */
function padBboxToAspect(
  bbox: { minLon: number; maxLon: number; minLat: number; maxLat: number },
  pxW: number,
  pxH: number,
) {
  let { minLon, maxLon, minLat, maxLat } = bbox;
  const lonSpan = maxLon - minLon || 1e-6;
  const latSpan = maxLat - minLat || 1e-6;
  const targetAspect = pxW / pxH; // lon-span / lat-span we want
  const dataAspect = lonSpan / latSpan;
  if (dataAspect < targetAspect) {
    // Too tall: grow lon.
    const want = latSpan * targetAspect;
    const pad = (want - lonSpan) / 2;
    minLon -= pad;
    maxLon += pad;
  } else {
    // Too wide: grow lat.
    const want = lonSpan / targetAspect;
    const pad = (want - latSpan) / 2;
    minLat -= pad;
    maxLat += pad;
  }
  return { minLon, maxLon, minLat, maxLat };
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
  /** Opt-in Mapbox basemap behind a GPS-like scatter/path track. No effect
   *  unless the plot is GPS-like and a Mapbox token is configured. */
  mapEnabled?: boolean;
  onReady?: (instance: ECharts | null) => void;
}

export function PlotChart({
  config,
  pairs,
  categorical,
  mapEnabled,
  onReady,
}: PlotChartProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<ECharts | null>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  // Map only applies to a GPS-like scatter/path with a configured token.
  const mapActive =
    !!mapEnabled && !!MAPBOX_ACCESS_TOKEN && isGpsLikePlot(config);

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
    // With the basemap on, plot geographically (lon = X, lat = Y) regardless of
    // the trace order the user picked, so the static map aligns north-up.
    const lonSig = isLonSignal(config.xSignal)
      ? config.xSignal
      : config.ySignals[0];
    const latSig = isLatSignal(config.xSignal)
      ? config.xSignal
      : config.ySignals[0];
    const x = mapActive ? lonSig : config.xSignal;
    const ySignals = mapActive ? [latSig] : config.ySignals;

    const series = ySignals.map((ySig, si) => {
      const pts: number[][] = [];
      pairs.rows.forEach((r) => {
        const xv = num(r, x);
        const yv = num(r, ySig);
        if (xv === null || yv === null) return;
        pts.push([xv, yv]);
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

    const grid = { top: 16, right: 16, bottom: 40, left: 56 };

    // GPS basemap: lock axes to a bbox padded to the grid pixel aspect so the
    // static image (sized to the grid rect) registers with the track. Axis
    // bounds and the image must share the same aspect to line up.
    let axisBounds:
      | { xMin: number; xMax: number; yMin: number; yMax: number }
      | null = null;
    if (mapActive) {
      let minLon = Infinity,
        maxLon = -Infinity,
        minLat = Infinity,
        maxLat = -Infinity;
      for (const s of series) {
        for (const [lon, lat] of s.data) {
          if (lon < minLon) minLon = lon;
          if (lon > maxLon) maxLon = lon;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        }
      }
      if (Number.isFinite(minLon) && Number.isFinite(minLat)) {
        const el = chartRef.current;
        const cw = el?.clientWidth || 600;
        const ch = el?.clientHeight || 320;
        // Grid pixel rect (container minus grid insets).
        const pxW = Math.max(1, cw - grid.left - grid.right);
        const pxH = Math.max(1, ch - grid.top - grid.bottom);
        const padded = padBboxToAspect(
          { minLon, maxLon, minLat, maxLat },
          pxW,
          pxH,
        );
        axisBounds = {
          xMin: padded.minLon,
          xMax: padded.maxLon,
          yMin: padded.minLat,
          yMax: padded.maxLat,
        };
      }
    }

    return {
      animation: false,
      tooltip: { trigger: "item", ...baseTooltip },
      grid,
      xAxis: {
        type: "value",
        name: x,
        nameLocation: "middle",
        nameGap: 26,
        nameTextStyle: { color: axisLabelColor },
        ...(axisBounds
          ? { scale: false, min: axisBounds.xMin, max: axisBounds.xMax }
          : { scale: true }),
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { color: axisLabelColor },
        splitLine: { lineStyle: { color: splitLineColor, type: "dashed" } },
      },
      yAxis: {
        type: "value",
        ...(axisBounds
          ? { scale: false, min: axisBounds.yMin, max: axisBounds.yMax }
          : { scale: true }),
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { color: axisLabelColor },
        splitLine: { lineStyle: { color: splitLineColor, type: "dashed" } },
      },
      series,
    };
  }, [config, pairs, categorical, mapActive]);

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

  // Lon/lat bbox of the locked axes — drives the basemap image bbox + URL.
  const mapBbox = useMemo(() => {
    if (!mapActive) return null;
    const o = option as {
      xAxis?: { min?: number; max?: number };
      yAxis?: { min?: number; max?: number };
    };
    const { min: minLon, max: maxLon } = o.xAxis ?? {};
    const { min: minLat, max: maxLat } = o.yAxis ?? {};
    if (
      minLon === undefined ||
      maxLon === undefined ||
      minLat === undefined ||
      maxLat === undefined
    ) {
      return null;
    }
    return { minLon, maxLon, minLat, maxLat };
  }, [mapActive, option]);

  // notMerge so switching plot kinds (and toggling the map off) never leaves
  // stale components behind — including the basemap graphic, which this wipes.
  // The basemap is then re-added in the same pass when a bbox is active, so the
  // two operations never race and no `$action: "remove"` is ever issued.
  useEffect(() => {
    const inst = instanceRef.current;
    if (!inst) return;
    inst.setOption(option, { notMerge: true });
    if (mapBbox) placeBasemap(inst, mapBbox);
  }, [option, mapBbox]);

  // Re-place the basemap over the (resized) grid rect. Merge-only, so it just
  // updates the existing image and can never remove a missing graphic.
  useEffect(() => {
    const inst = instanceRef.current;
    const el = chartRef.current;
    if (!inst || !el || !mapBbox) return;
    const ro = new ResizeObserver(() => placeBasemap(inst, mapBbox));
    ro.observe(el);
    return () => ro.disconnect();
  }, [mapBbox]);

  return <div ref={chartRef} className="h-[320px] w-full" />;
}

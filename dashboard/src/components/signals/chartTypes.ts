import { newStmtId, type TraceStmt } from "@/components/signals/MqlEditor";
import {
  AreaChart,
  BarChart3,
  BarChartHorizontal,
  Box,
  LineChart,
  PieChart,
  ScatterChart,
  Spline,
  type LucideIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Chart-type registry — the single source of truth for every kind of widget the
// Signals page can render. One unified widget reads this to decide its icon, its
// data path (which endpoint to hit + which chart component to render), and the
// default MQL trace list to fall back to when a chart-type switch can't carry
// the current MQL across (see `compatible`).
// ---------------------------------------------------------------------------

export type ChartType =
  // time-series: aggregate buckets over the shared time axis (/query/run → QueryChart)
  | "bar"
  | "line"
  | "area"
  // categorical: group-by aggregate, one bar/slice per group (/query/run → PlotChart)
  | "catbar"
  | "pie"
  // pairs: signal-vs-signal raw samples (/query/pairs → PlotChart)
  | "scatter"
  | "path"
  | "scatter3d";

/** Which endpoint a chart type fetches from and which renderer consumes it.
 *  Drives both the data layer and chart-switch compatibility. */
export type DataPath = "timeseries" | "categorical" | "pairs";

export interface ChartTypeDef {
  type: ChartType;
  label: string;
  icon: LucideIcon;
  path: DataPath;
  /** true → primary inline icon in the toggle; false → behind the chevron. */
  inline: boolean;
  /** Trace list to seed when switching to this type from an incompatible one.
   *  A factory (not a constant) so every reset mints fresh statement ids. */
  defaultTraces: () => TraceStmt[];
}

/** The default a fresh widget / a compatible time-series or categorical switch
 *  lands on — the same `count(signal)` you see on first opening Signals. */
function defaultRunTraces(): TraceStmt[] {
  return [{ id: newStmtId(), mql: "count(signal)" }];
}

/** Pairs plots resolve one signal per trace line by position (X, Y[, Z]); seed
 *  empty `name` filters so the user fills the axis signals. `n` lines: 2 for
 *  scatter/path, 3 for 3D scatter. */
function defaultPairTraces(n: number): () => TraceStmt[] {
  return () =>
    Array.from({ length: n }, () => ({
      id: newStmtId(),
      mql: 'avg(value).where(name = "")',
    }));
}

export const CHART_TYPES: ChartTypeDef[] = [
  { type: "bar",       label: "Bar",          icon: BarChart3,          path: "timeseries",  inline: true,  defaultTraces: defaultRunTraces },
  { type: "line",      label: "Line",         icon: LineChart,          path: "timeseries",  inline: true,  defaultTraces: defaultRunTraces },
  { type: "area",      label: "Area",         icon: AreaChart,          path: "timeseries",  inline: true,  defaultTraces: defaultRunTraces },
  { type: "scatter",   label: "Scatter",      icon: ScatterChart,       path: "pairs",       inline: false, defaultTraces: defaultPairTraces(2) },
  { type: "path",      label: "Path",         icon: Spline,             path: "pairs",       inline: false, defaultTraces: defaultPairTraces(2) },
  { type: "scatter3d", label: "3D",           icon: Box,                path: "pairs",       inline: false, defaultTraces: defaultPairTraces(3) },
  { type: "catbar",    label: "Category",     icon: BarChartHorizontal, path: "categorical", inline: false, defaultTraces: defaultRunTraces },
  { type: "pie",       label: "Pie",          icon: PieChart,           path: "categorical", inline: false, defaultTraces: defaultRunTraces },
];

export const CHART_TYPE_MAP: Record<ChartType, ChartTypeDef> = Object.fromEntries(
  CHART_TYPES.map((d) => [d.type, d]),
) as Record<ChartType, ChartTypeDef>;

export const INLINE_CHART_TYPES = CHART_TYPES.filter((d) => d.inline);

export function dataPath(type: ChartType): DataPath {
  return CHART_TYPE_MAP[type].path;
}

/** Whether the current MQL trace list can carry across a type switch. Both
 *  `/query/run` paths share the MQL grammar so time-series ↔ categorical is
 *  lossless; pairs uses position-as-axis raw samples, so crossing into or out of
 *  it resets to the target's default traces. */
export function compatible(from: ChartType, to: ChartType): boolean {
  const a = dataPath(from);
  const b = dataPath(to);
  if (a === b) return true;
  return a !== "pairs" && b !== "pairs";
}

import { newStmtId, type QueryStmt } from "@/components/signals/MqlEditor";
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

// Chart-type registry — source of truth for the icon, data path (endpoint +
// renderer), and default MQL of every widget kind the Signals page renders.

export type ChartType =
  // time-series (/query/run → QueryChart)
  | "bar"
  | "line"
  | "area"
  // categorical: group-by aggregate (/query/run → PlotChart)
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
  defaultQueries: () => QueryStmt[];
}

/** Default a fresh widget / a compatible run-path switch lands on. */
function defaultRunQueries(): QueryStmt[] {
  return [{ id: newStmtId(), mql: "count(signal)" }];
}

/** `n` empty-name trace lines for the pairs path (2 for scatter/path, 3 for 3D),
 *  one per axis by position. */
function defaultPairQueries(n: number): () => QueryStmt[] {
  return () =>
    Array.from({ length: n }, () => ({
      id: newStmtId(),
      mql: 'avg(value).where(name = "")',
    }));
}

export const CHART_TYPES: ChartTypeDef[] = [
  { type: "bar",       label: "Bar",          icon: BarChart3,          path: "timeseries",  inline: true,  defaultQueries: defaultRunQueries },
  { type: "line",      label: "Line",         icon: LineChart,          path: "timeseries",  inline: true,  defaultQueries: defaultRunQueries },
  { type: "area",      label: "Area",         icon: AreaChart,          path: "timeseries",  inline: true,  defaultQueries: defaultRunQueries },
  { type: "scatter",   label: "Scatter",      icon: ScatterChart,       path: "pairs",       inline: false, defaultQueries: defaultPairQueries(2) },
  { type: "path",      label: "Path",         icon: Spline,             path: "pairs",       inline: false, defaultQueries: defaultPairQueries(2) },
  { type: "scatter3d", label: "3D",           icon: Box,                path: "pairs",       inline: false, defaultQueries: defaultPairQueries(3) },
  { type: "catbar",    label: "Category",     icon: BarChartHorizontal, path: "categorical", inline: false, defaultQueries: defaultRunQueries },
  { type: "pie",       label: "Pie",          icon: PieChart,           path: "categorical", inline: false, defaultQueries: defaultRunQueries },
];

export const CHART_TYPE_MAP: Record<ChartType, ChartTypeDef> = Object.fromEntries(
  CHART_TYPES.map((d) => [d.type, d]),
) as Record<ChartType, ChartTypeDef>;

export const INLINE_CHART_TYPES = CHART_TYPES.filter((d) => d.inline);

export function dataPath(type: ChartType): DataPath {
  return CHART_TYPE_MAP[type].path;
}

/** Whether the MQL carries across a type switch. The two /query/run paths share
 *  the grammar (lossless); crossing into/out of pairs resets to defaults. */
export function compatible(from: ChartType, to: ChartType): boolean {
  const a = dataPath(from);
  const b = dataPath(to);
  if (a === b) return true;
  return a !== "pairs" && b !== "pairs";
}

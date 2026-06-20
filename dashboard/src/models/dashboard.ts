// Mirrors mapache-go's Dashboard + DashboardWidget. Field names are
// snake_case on the wire and camelCase nowhere — the dashboard fetches
// the raw JSON and consumes it without aliasing, so keep these shapes
// byte-identical to the Go structs.

export interface DashboardWidget {
  id: string;
  dashboard_id: string;
  // Widget renderer key. `signal` is the only one shipped in PR #1;
  // future types (`gauge`, `map`, `bignumber`, `table`) plug into the
  // same registry.
  type: WidgetType;
  // Type-specific settings (e.g. for `signal`: queries[], chart_type,
  // axis overrides). Stored as jsonb on the backend.
  config: WidgetConfig;
  // react-grid-layout coordinates. The dashboard grid is 12 cols wide;
  // h/w are in cell units, x/y are zero-based.
  x: number;
  y: number;
  w: number;
  h: number;
  updated_at: string;
  created_at: string;
}

export type WidgetType = "signal";

// Each widget renderer carries its own config shape. The signal widget
// stores the MQL statements + chart-type + a couple of display knobs;
// future widget types will widen this union.
export type WidgetConfig = SignalWidgetConfig;

export interface SignalWidgetConfig {
  // Title shown in the widget's header. Empty falls back to "Untitled".
  title?: string;
  // MQL statements (one per line in the chip editor). At least one.
  queries: string[];
  // Chart-type key from the existing chartTypes registry (bar, line,
  // area, scatter, …). Defaults to "bar" if missing.
  chart_type?: string;
}

export interface Dashboard {
  id: string;
  name: string;
  description: string;
  created_by: string;
  widgets: DashboardWidget[];
  updated_at: string;
  created_at: string;
}

export const initDashboard: Dashboard = {
  id: "",
  name: "",
  description: "",
  created_by: "",
  widgets: [],
  updated_at: "",
  created_at: "",
};

// Default coordinates for a freshly-added widget. The grid is 12 cols
// wide; w=6 / h=8 gives a half-width chart that's tall enough to read.
// Placement (x, y) is set by the page based on whatever's already there.
export const DEFAULT_WIDGET_SIZE = { w: 6, h: 8 } as const;

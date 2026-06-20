// HTTP client for the dashboards CRUD surface. The gateway wraps each
// response once under `data`, so Go endpoints (bare body) read as
// `response.data.data` — matches the convention sessions/api.ts uses.

import { BACKEND_URL } from "@/consts/config";
import { http } from "@/lib/http";
import type {
  Dashboard,
  DashboardWidget,
  WidgetConfig,
  WidgetType,
} from "@/models/dashboard";

export async function fetchDashboards(): Promise<Dashboard[]> {
  const r = await http.get(`${BACKEND_URL}/dashboards`);
  return (r.data?.data as Dashboard[]) ?? [];
}

export async function fetchDashboard(id: string): Promise<Dashboard> {
  const r = await http.get(`${BACKEND_URL}/dashboards/${id}`);
  return r.data?.data as Dashboard;
}

export async function createDashboard(input: {
  name: string;
  description?: string;
}): Promise<Dashboard> {
  const r = await http.post(`${BACKEND_URL}/dashboards`, {
    name: input.name,
    description: input.description ?? "",
  });
  return r.data?.data as Dashboard;
}

export async function updateDashboard(
  id: string,
  patch: { name?: string; description?: string },
): Promise<Dashboard> {
  // The backend's UpdateDashboard preserves CreatedBy/CreatedAt; we only
  // need to send the mutable fields.
  const r = await http.put(`${BACKEND_URL}/dashboards/${id}`, patch);
  return r.data?.data as Dashboard;
}

export async function deleteDashboard(id: string): Promise<void> {
  await http.delete(`${BACKEND_URL}/dashboards/${id}`);
}

export async function createWidget(
  dashboardID: string,
  input: {
    type: WidgetType;
    config: WidgetConfig;
    x: number;
    y: number;
    w: number;
    h: number;
  },
): Promise<DashboardWidget> {
  const r = await http.post(
    `${BACKEND_URL}/dashboards/${dashboardID}/widgets`,
    input,
  );
  return r.data?.data as DashboardWidget;
}

// Drag/resize fires UpdateWidget on every release. The grid is the
// source of truth for x/y/w/h; the page debounces config-only changes
// so each chip edit isn't its own PUT.
export async function updateWidget(
  dashboardID: string,
  widgetID: string,
  widget: Partial<DashboardWidget>,
): Promise<DashboardWidget> {
  const r = await http.put(
    `${BACKEND_URL}/dashboards/${dashboardID}/widgets/${widgetID}`,
    widget,
  );
  return r.data?.data as DashboardWidget;
}

export async function deleteWidget(
  dashboardID: string,
  widgetID: string,
): Promise<void> {
  await http.delete(`${BACKEND_URL}/dashboards/${dashboardID}/widgets/${widgetID}`);
}

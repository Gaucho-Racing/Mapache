import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { OutlineButton } from "@/components/ui/outline-button";
import { getAxiosErrorMessage } from "@/lib/axios-error-handler";
import { BACKEND_URL } from "@/consts/config";
import {
  createWidget,
  deleteWidget,
  fetchDashboard,
  updateDashboard,
  updateWidget,
} from "@/lib/dashboards";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { useVehicle } from "@/lib/store";
import {
  DEFAULT_WIDGET_SIZE,
  type Dashboard,
  type DashboardWidget,
  type SignalWidgetConfig,
} from "@/models/dashboard";
import axios from "axios";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import GridLayout, { type Layout as RGLLayout } from "react-grid-layout";
import { useNavigate, useParams } from "react-router-dom";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { DashboardWidgetCard } from "@/components/dashboards/DashboardWidgetCard";
import { AddWidgetDrawer } from "@/components/dashboards/AddWidgetDrawer";
import {
  defaultTimeframe,
  type Timeframe,
  TimeframePicker,
} from "@/components/signals/TimeframePicker";
import type { ChartType } from "@/components/signals/ChartTypeToggle";

const GRID_COLS = 12;
const ROW_HEIGHT = 30;
const MARGIN: [number, number] = [12, 12];

const SYNC_GROUP_ID = "dashboard-widgets";

function DashboardDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const vehicle = useVehicle();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [gridWidth, setGridWidth] = useState(1200);
  // Page-level timeframe — every widget plots the same window. Will
  // eventually allow per-widget override; for now the dashboard reads
  // as one cohesive view.
  const [timeframe, setTimeframe] = useState<Timeframe>(defaultTimeframe);
  // Cached signal-name list for the active vehicle, used by the chip
  // builder's autocomplete inside each widget.
  const [signalNames, setSignalNames] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    if (!vehicle?.id) return;
    let cancelled = false;
    axios
      .get(`${BACKEND_URL}/query/signals`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
        },
        params: { vehicle_id: vehicle.id },
      })
      .then((res) => {
        if (cancelled) return;
        const rows = res.data?.data?.data ?? res.data?.data ?? [];
        setSignalNames(rows.map((r: { name: string }) => r.name));
      })
      .catch(() => {
        // Autocomplete is non-blocking — failure just means the
        // dropdown shows nothing. The chart still runs.
      });
    return () => {
      cancelled = true;
    };
  }, [vehicle?.id]);

  // Resolve the timeframe to the iso strings + range every widget needs.
  // "Rolling" mode = the window's right edge tracks `now`; that's true
  // for every Past-N preset and for any custom range whose end is within
  // a few seconds of now. Live-blending widgets watch this flag.
  const { startIso, endIso, rangeSeconds, isRolling } = useMemo(() => {
    const start = timeframe.start.toISOString();
    const end = timeframe.end.toISOString();
    const range = Math.max(
      1,
      Math.round((timeframe.end.getTime() - timeframe.start.getTime()) / 1000),
    );
    const rolling =
      timeframe.label.startsWith("Past ") ||
      Math.abs(timeframe.end.getTime() - Date.now()) < 5_000;
    return { startIso: start, endIso: end, rangeSeconds: range, isRolling: rolling };
  }, [timeframe]);

  // Track the rendered area's width so the grid sizes columns to the
  // container, not the viewport — sidebars and padding both eat real estate.
  useEffect(() => {
    const measure = () => {
      const el = document.getElementById("dashboard-grid-host");
      if (el) setGridWidth(el.clientWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    const el = document.getElementById("dashboard-grid-host");
    if (el) ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [dashboard]);

  const reload = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      setDashboard(await fetchDashboard(id));
    } catch (e) {
      notify.error(getAxiosErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  const handleRename = async (name: string) => {
    if (!dashboard || name === dashboard.name) return;
    try {
      const next = await updateDashboard(dashboard.id, { name });
      setDashboard((d) => (d ? { ...d, ...next } : d));
    } catch (e) {
      notify.error(getAxiosErrorMessage(e));
    }
  };

  // react-grid-layout calls onLayoutChange on every drag/resize commit.
  // The widget IDs are stable so the layout array maps cleanly back to
  // our widget rows; fire one PUT per widget whose coords actually moved.
  const handleLayoutChange = async (layout: RGLLayout[]) => {
    if (!dashboard) return;
    const byId = new Map(layout.map((l) => [l.i, l] as const));
    const moved: DashboardWidget[] = [];
    for (const w of dashboard.widgets) {
      const l = byId.get(w.id);
      if (!l) continue;
      if (l.x === w.x && l.y === w.y && l.w === w.w && l.h === w.h) continue;
      moved.push({ ...w, x: l.x, y: l.y, w: l.w, h: l.h });
    }
    if (moved.length === 0) return;
    // Optimistic update — assume the PUT succeeds. A failure logs but
    // doesn't roll back the grid; the user can resize again to retry.
    setDashboard((d) =>
      d
        ? {
            ...d,
            widgets: d.widgets.map(
              (w) => moved.find((m) => m.id === w.id) ?? w,
            ),
          }
        : d,
    );
    try {
      await Promise.all(
        moved.map((w) => updateWidget(dashboard.id, w.id, w)),
      );
    } catch (e) {
      notify.error(getAxiosErrorMessage(e));
    }
  };

  const handleAddSignalWidget = async (chartType: ChartType = "bar") => {
    if (!dashboard) return;
    const config: SignalWidgetConfig = {
      title: "New widget",
      queries: ["count(signal.name)"],
      chart_type: chartType,
    };
    // Place new widgets at the bottom of the current layout so they
    // never overlap. y = max(y + h) across existing widgets.
    const yBottom = dashboard.widgets.reduce(
      (m, w) => Math.max(m, w.y + w.h),
      0,
    );
    try {
      const w = await createWidget(dashboard.id, {
        type: "signal",
        config,
        x: 0,
        y: yBottom,
        w: DEFAULT_WIDGET_SIZE.w,
        h: DEFAULT_WIDGET_SIZE.h,
      });
      setDashboard((d) => (d ? { ...d, widgets: [...d.widgets, w] } : d));
    } catch (e) {
      notify.error(getAxiosErrorMessage(e));
    }
  };

  const handleRemoveWidget = async (widgetID: string) => {
    if (!dashboard) return;
    try {
      await deleteWidget(dashboard.id, widgetID);
      setDashboard((d) =>
        d ? { ...d, widgets: d.widgets.filter((w) => w.id !== widgetID) } : d,
      );
    } catch (e) {
      notify.error(getAxiosErrorMessage(e));
    }
  };

  const handleUpdateWidgetConfig = async (
    widgetID: string,
    config: SignalWidgetConfig,
  ) => {
    if (!dashboard) return;
    const existing = dashboard.widgets.find((w) => w.id === widgetID);
    if (!existing) return;
    const next = { ...existing, config };
    setDashboard((d) =>
      d
        ? { ...d, widgets: d.widgets.map((w) => (w.id === widgetID ? next : w)) }
        : d,
    );
    try {
      await updateWidget(dashboard.id, widgetID, next);
    } catch (e) {
      notify.error(getAxiosErrorMessage(e));
    }
  };

  const layout = useMemo<RGLLayout[]>(
    () =>
      dashboard?.widgets.map((w) => ({
        i: w.id,
        x: w.x,
        y: w.y,
        w: w.w,
        h: w.h,
        minW: 2,
        minH: 3,
      })) ?? [],
    [dashboard],
  );

  if (loading) {
    return (
      <Layout activeTab="dashboards" headerTitle="Dashboard">
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!dashboard) {
    return (
      <Layout activeTab="dashboards" headerTitle="Dashboard">
        <Card className="p-8 text-center text-muted-foreground">
          Dashboard not found.
        </Card>
      </Layout>
    );
  }

  return (
    <Layout activeTab="dashboards" headerTitle={dashboard.name || "Dashboard"}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/dashboards")}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Back to dashboards"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <Input
              defaultValue={dashboard.name}
              onBlur={(e) => handleRename(e.target.value)}
              className="h-8 max-w-[360px] text-lg font-semibold"
              placeholder="Untitled dashboard"
            />
          </div>
          <div className="flex items-center gap-2">
            <TimeframePicker
              value={timeframe}
              onChange={setTimeframe}
              vehicleId={vehicle?.id ?? ""}
            />
            <OutlineButton onClick={() => setAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add widget
            </OutlineButton>
          </div>
        </div>

        <AddWidgetDrawer
          open={addOpen}
          onOpenChange={setAddOpen}
          onPick={(chartType) => {
            setAddOpen(false);
            handleAddSignalWidget(chartType);
          }}
        />

        <div id="dashboard-grid-host" className="w-full">
          {dashboard.widgets.length === 0 ? (
            <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center text-muted-foreground">
              <p>Empty dashboard.</p>
              <p className="text-xs">
                Add a signal widget to start charting. Drag the title bar to
                move, resize from any edge.
              </p>
            </Card>
          ) : (
            <GridLayout
              className="layout"
              layout={layout}
              cols={GRID_COLS}
              rowHeight={ROW_HEIGHT}
              width={gridWidth}
              margin={MARGIN}
              draggableHandle=".widget-drag-handle"
              onLayoutChange={handleLayoutChange}
              isResizable
              isDraggable
            >
              {dashboard.widgets.map((w) => (
                <div key={w.id} className={cn("overflow-hidden")}>
                  <DashboardWidgetCard
                    widget={w}
                    vehicleId={vehicle?.id ?? ""}
                    vehicleType={vehicle?.type ?? ""}
                    signalNames={signalNames}
                    startIso={startIso}
                    endIso={endIso}
                    rangeSeconds={rangeSeconds}
                    isRolling={isRolling}
                    groupId={SYNC_GROUP_ID}
                    onRemove={() => handleRemoveWidget(w.id)}
                    onConfigChange={(config) =>
                      handleUpdateWidgetConfig(w.id, config)
                    }
                  />
                </div>
              ))}
            </GridLayout>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default DashboardDetailsPage;

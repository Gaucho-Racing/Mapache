import Layout from "@/components/Layout";
import { TimeProvider } from "@/context/time-context";
import {
  useVehicle,
  useDashboardPlacements,
  setDashboardPlacements,
  loadDashboardPlacements,
  saveDashboardPlacements,
  DashboardPlacement,
} from "@/lib/store";
import { useEffect, useState, useMemo } from "react";
import { getWidgetRegistry, WidgetEntry } from "@/components/widgets/registry";
import { WidgetPickerDialog } from "@/components/widgets/WidgetPickerDialog";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

function DashboardContent() {
  const vehicle = useVehicle();
  const placements = useDashboardPlacements();
  const [pickerOpen, setPickerOpen] = useState(false);

  const registry = useMemo(
    () => getWidgetRegistry(vehicle.type),
    [vehicle.type],
  );

  const allWidgets = useMemo(
    () => Object.values(registry).flat() as WidgetEntry[],
    [registry],
  );

  // Load saved placements from localStorage on vehicle change
  useEffect(() => {
    const saved = loadDashboardPlacements(vehicle.type);
    setDashboardPlacements(saved);
  }, [vehicle.type]);

  // Build the list of widget entries from placements + registry
  const placedWidgets: { entry: WidgetEntry; placement: DashboardPlacement }[] =
    useMemo(() => {
      return placements
        .map((p) => {
          const entry = allWidgets.find((w) => w.id === p.id);
          return entry ? { entry, placement: p } : null;
        })
        .filter((w): w is NonNullable<typeof w> => w !== null);
    }, [placements, allWidgets]);

  // Calculate which columns are occupied by existing widgets
  const occupiedColumns = useMemo(() => {
    const cols = new Set<number>();
    for (const pw of placedWidgets) {
      const span = pw.entry.span ?? 6;
      for (
        let c = pw.placement.columnStart;
        c < pw.placement.columnStart + span;
        c++
      ) {
        cols.add(c);
      }
    }
    return cols;
  }, [placedWidgets]);

  // Auto-place: find the first valid column start for a given span
  const findFreeColumnStart = (span: number): number => {
    for (let col = 1; col + span <= 13; col++) {
      let free = true;
      for (let c = col; c < col + span; c++) {
        if (occupiedColumns.has(c)) {
          free = false;
          break;
        }
      }
      if (free) return col;
    }
    return 1; // fallback
  };

  const handlePickWidget = (widget: WidgetEntry) => {
    const span = widget.span ?? 6;
    const columnStart = findFreeColumnStart(span);
    const newPlacement: DashboardPlacement = { id: widget.id, columnStart };
    const newPlacements = [...placements, newPlacement];
    setDashboardPlacements(newPlacements);
    saveDashboardPlacements(vehicle.type, newPlacements);
  };

  const removeWidget = (placementId: string) => {
    const newPlacements = placements.filter((p) => p.id !== placementId);
    setDashboardPlacements(newPlacements);
    saveDashboardPlacements(vehicle.type, newPlacements);
  };

  return (
    <Layout activeTab="dashboard" headerTitle="Dashboard">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Configure your live dashboard for{" "}
              <span className="font-semibold">{vehicle.name}</span>. Only the
              last 10 seconds of data is shown per widget.
            </p>
          </div>
          <Button onClick={() => setPickerOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Widget
          </Button>
        </div>

        {placedWidgets.length === 0 ? (
          <div className="flex h-[400px] items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25">
            <div className="text-center">
              <p className="mb-2 text-lg font-semibold text-muted-foreground">
                No widgets configured
              </p>
              <p className="mb-4 text-sm text-muted-foreground">
                Click "Add Widget" to start building your dashboard.
              </p>
              <Button variant="outline" onClick={() => setPickerOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Widget
              </Button>
            </div>
          </div>
        ) : (
          <div className="dashboard-grid">
            {placedWidgets.map(({ entry, placement }) => {
              const WidgetComponent = entry.component;
              const span = entry.span ?? 6;
              return (
                <div
                  key={placement.id}
                  className="dashboard-grid-item"
                  style={{
                    gridColumn: `${placement.columnStart} / span ${span}`,
                  }}
                >
                  {entry.id !== "bms-cells" && (
                    <button
                      onClick={() => removeWidget(placement.id)}
                      className="absolute right-2 top-2 z-20 rounded-md bg-background/80 p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                      title={`Remove ${entry.name}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  <WidgetComponent
                    vehicle_id={vehicle.id}
                    showDeltaBanner
                    {...(entry.id === "bms-cells"
                      ? { onRemove: () => removeWidget(placement.id) }
                      : {})}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <WidgetPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={handlePickWidget}
      />
    </Layout>
  );
}

function App() {
  return (
    <TimeProvider interval={100}>
      <DashboardContent />
    </TimeProvider>
  );
}

export default App;

import { Input } from "@/components/ui/input";
import { SignalWidget } from "@/components/signals/SignalWidget";
import { cn } from "@/lib/utils";
import type {
  DashboardWidget,
  SignalWidgetConfig,
} from "@/models/dashboard";
import type { Lap } from "@/models/session";
import { GripVertical, Trash2 } from "lucide-react";
import type { ChartType } from "@/components/signals/ChartTypeToggle";

interface Props {
  widget: DashboardWidget;
  vehicleId: string;
  vehicleType: string;
  signalNames: string[];
  startIso: string;
  endIso: string;
  rangeSeconds: number;
  /** True when the window's right edge tracks `now` (any "Past N"
   *  preset, or a custom range ending within seconds of now). Live-
   *  blending widgets watch this to know when to open a stream. */
  isRolling: boolean;
  /** ECharts connect group shared across all widgets on this dashboard
   *  so hover/tooltip/dataZoom syncs between panels. */
  groupId: string;
  laps?: Lap[] | null;
  onRemove: () => void;
  onConfigChange: (next: SignalWidgetConfig) => void;
}

/** Widget shell + embedded renderer. The shell carries the drag handle,
 *  title input, and remove button; the renderer plugs in by widget type
 *  ("signal" reuses SignalWidget; future types fan out from here). */
export function DashboardWidgetCard({
  widget,
  vehicleId,
  vehicleType,
  signalNames,
  startIso,
  endIso,
  rangeSeconds,
  isRolling,
  groupId,
  laps,
  onRemove,
  onConfigChange,
}: Props) {
  if (widget.type !== "signal") {
    return (
      <WidgetShell title={`Unknown widget: ${widget.type}`} onRemove={onRemove}>
        <div className="flex flex-1 items-center justify-center p-4 text-xs text-muted-foreground">
          Unsupported widget type — update the dashboard to render it.
        </div>
      </WidgetShell>
    );
  }

  const config = widget.config as SignalWidgetConfig;
  const handleTitleChange = (title: string) =>
    onConfigChange({ ...config, title });
  const handleQueriesChange = (queries: string[]) =>
    onConfigChange({ ...config, queries });
  const handleChartTypeChange = (chart_type: ChartType) =>
    onConfigChange({ ...config, chart_type });

  return (
    <WidgetShell
      title={config.title ?? ""}
      onTitleChange={handleTitleChange}
      onRemove={onRemove}
    >
      <div className="min-h-0 flex-1 overflow-auto p-2">
        <SignalWidget
          vehicleId={vehicleId}
          vehicleType={vehicleType}
          signalNames={signalNames}
          startIso={startIso}
          endIso={endIso}
          rangeSeconds={rangeSeconds}
          groupId={groupId}
          hidden={false}
          // The dashboard owns hide/delete at the shell level — pipe
          // SignalWidget's internal kebab actions into no-ops so they
          // don't fight with the wrapping card's controls.
          onToggleHide={() => undefined}
          onDelete={onRemove}
          onBrushSelect={() => undefined}
          laps={laps ?? null}
          seedQueries={config.queries}
          onQueriesChange={handleQueriesChange}
          seedChartType={(config.chart_type as ChartType | undefined) ?? "bar"}
          onChartTypeChange={handleChartTypeChange}
          refreshIntervalSec={isRolling ? 5 : undefined}
        />
      </div>
    </WidgetShell>
  );
}

function WidgetShell({
  title,
  onTitleChange,
  onRemove,
  children,
}: {
  title: string;
  onTitleChange?: (next: string) => void;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col rounded-lg border bg-card">
      <div className="widget-drag-handle flex cursor-grab items-center gap-2 border-b px-3 py-2 active:cursor-grabbing">
        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50" />
        {onTitleChange ? (
          <Input
            defaultValue={title}
            onBlur={(e) => onTitleChange(e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            placeholder="Untitled widget"
            className={cn(
              "h-7 flex-1 border-0 bg-transparent px-1 text-sm font-medium shadow-none focus-visible:ring-0",
            )}
          />
        ) : (
          <span className="flex-1 truncate text-sm font-medium">{title}</span>
        )}
        <button
          type="button"
          onClick={onRemove}
          onMouseDown={(e) => e.stopPropagation()}
          aria-label="Remove widget"
          className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {children}
    </div>
  );
}

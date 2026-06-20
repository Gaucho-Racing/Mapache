import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SignalWidget } from "@/components/signals/SignalWidget";
import { cn } from "@/lib/utils";
import { parseQuery } from "@/lib/query";
import type {
  DashboardWidget,
  SignalWidgetConfig,
} from "@/models/dashboard";
import type { Lap } from "@/models/session";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { ChartType } from "@/components/signals/ChartTypeToggle";

interface Props {
  widget: DashboardWidget;
  vehicleId: string;
  vehicleType: string;
  signalNames: string[];
  startIso: string;
  endIso: string;
  rangeSeconds: number;
  isRolling: boolean;
  groupId: string;
  laps?: Lap[] | null;
  onRemove: () => void;
  onConfigChange: (next: SignalWidgetConfig) => void;
}

/** Widget shell — drag handle, title, edit, remove. Body renders the
 *  chart-only SignalWidget; clicking edit opens a dialog with the full
 *  builder. Card and dialog are mutually-exclusive (the card's
 *  SignalWidget unmounts while editing) so their internal query/chart
 *  state can never drift apart. */
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
  const [editing, setEditing] = useState(false);

  if (widget.type !== "signal") {
    return (
      <WidgetShell
        title={`Unknown widget: ${widget.type}`}
        onRemove={onRemove}
      >
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

  // Pull every `where(name = "...")` literal out of each query so the
  // streaming subscription only sees signals the chart actually plots.
  // Queries with no name filter get skipped here (subscribing to "*"
  // would flood the wire).
  const streamSignalPatterns = useMemo(() => {
    const set = new Set<string>();
    for (const mql of config.queries) {
      const res = parseQuery(mql);
      if (!res.ok) continue;
      for (const p of res.query.filters) {
        if (p.column !== "name" || p.op !== "=" || !p.value) continue;
        set.add(p.value);
      }
    }
    return Array.from(set);
  }, [config.queries]);

  // Shared props every SignalWidget instance receives. Used twice —
  // once for the card-chart, once for the edit-dialog editor.
  const sharedSignalWidgetProps = {
    vehicleId,
    vehicleType,
    signalNames,
    startIso,
    endIso,
    rangeSeconds,
    groupId,
    hidden: false,
    onToggleHide: () => undefined,
    onDelete: onRemove,
    onBrushSelect: () => undefined,
    laps: laps ?? null,
    seedQueries: config.queries,
    onQueriesChange: handleQueriesChange,
    seedChartType: (config.chart_type as ChartType | undefined) ?? "bar",
    onChartTypeChange: handleChartTypeChange,
    refreshIntervalSec: isRolling ? 5 : undefined,
    streamSignalPatterns: isRolling ? streamSignalPatterns : undefined,
  };

  return (
    <>
      <WidgetShell
        title={config.title ?? ""}
        onTitleChange={handleTitleChange}
        onEdit={() => setEditing(true)}
        onRemove={onRemove}
      >
        <div className="min-h-0 flex-1 overflow-hidden p-2">
          {/* Keying on the queries+chart_type causes a remount when the
              dialog persists a change, so the card picks up the new
              seed instead of being stuck on stale internal state. */}
          {!editing && (
            <SignalWidget
              key={`${config.queries.join("|")}::${config.chart_type ?? "bar"}`}
              {...sharedSignalWidgetProps}
              chartOnly
            />
          )}
        </div>
      </WidgetShell>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-auto">
          <DialogHeader>
            <DialogTitle>Edit widget</DialogTitle>
          </DialogHeader>
          {editing && (
            <SignalWidget {...sharedSignalWidgetProps} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function WidgetShell({
  title,
  onTitleChange,
  onEdit,
  onRemove,
  children,
}: {
  title: string;
  onTitleChange?: (next: string) => void;
  onEdit?: () => void;
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
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            onMouseDown={(e) => e.stopPropagation()}
            aria-label="Edit widget"
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
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

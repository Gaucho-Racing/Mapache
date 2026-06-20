import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type {
  DashboardWidget,
  SignalWidgetConfig,
} from "@/models/dashboard";
import { GripVertical, Trash2 } from "lucide-react";

interface Props {
  widget: DashboardWidget;
  onRemove: () => void;
  onConfigChange: (next: SignalWidgetConfig) => void;
}

/** Widget shell — drag handle, title input, remove button, chart slot.
 *  The slot is a placeholder for PR #1; PR #2 wires up the actual
 *  SignalWidget chart so resizing this card visibly updates the chart. */
export function DashboardWidgetCard({ widget, onRemove, onConfigChange }: Props) {
  // For now only the `signal` type ships. Unknown types render a small
  // placeholder so a forward-compat backend doesn't crash the page.
  if (widget.type !== "signal") {
    return (
      <Card className="flex h-full flex-col">
        <WidgetHeader title={`Unknown widget: ${widget.type}`} onRemove={onRemove} />
        <div className="flex flex-1 items-center justify-center p-4 text-xs text-muted-foreground">
          Unsupported widget type.
        </div>
      </Card>
    );
  }

  const config = widget.config as SignalWidgetConfig;
  const setTitle = (title: string) =>
    onConfigChange({ ...config, title });

  return (
    <Card className="flex h-full flex-col">
      <WidgetHeader
        title={config.title ?? ""}
        onTitleChange={setTitle}
        onRemove={onRemove}
      />
      <div className="min-h-0 flex-1 p-3">
        {/* Placeholder chart pane. PR #2 swaps this for the real
            SignalWidget chart driven by config.queries. */}
        <div className="flex h-full flex-col gap-2 rounded-md border bg-muted/20 p-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Queries
          </span>
          <ul className="flex flex-col gap-1">
            {config.queries.map((q, i) => (
              <li key={i} className="break-all font-mono text-xs text-foreground/80">
                {q}
              </li>
            ))}
          </ul>
          <div className="flex flex-1 items-center justify-center text-xs italic text-muted-foreground/70">
            Chart renders in a follow-up PR.
          </div>
        </div>
      </div>
    </Card>
  );
}

function WidgetHeader({
  title,
  onTitleChange,
  onRemove,
}: {
  title: string;
  onTitleChange?: (next: string) => void;
  onRemove: () => void;
}) {
  return (
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
  );
}

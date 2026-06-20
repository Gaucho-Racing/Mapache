import { CHART_TYPES } from "@/components/signals/chartTypes";
import type { ChartType } from "@/components/signals/ChartTypeToggle";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the picked chart type; the dashboard creates a fresh
   *  `signal` widget seeded with that chart type. */
  onPick: (chartType: ChartType) => void;
}

/** Right-edge drawer that lists every widget type the dashboard knows
 *  how to render. PR #1 ships only the signal-driven chart family;
 *  specialty widgets (gauge, big-number, dedicated map) join this list
 *  in PR #2 and get the same picker treatment. */
export function AddWidgetDrawer({ open, onOpenChange, onPick }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] sm:max-w-[420px]">
        <SheetHeader>
          <SheetTitle>Add widget</SheetTitle>
          <SheetDescription>
            Pick a chart type to drop on the dashboard. Every widget is
            driven by an MQL query — you can edit it after.
          </SheetDescription>
        </SheetHeader>

        <div className="-mr-2 mt-4 flex flex-col gap-2 overflow-y-auto pr-2">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Charts
          </span>
          <div className="grid grid-cols-2 gap-2">
            {CHART_TYPES.map((t) => (
              <button
                key={t.type}
                type="button"
                onClick={() => onPick(t.type)}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-md border bg-background p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/40",
                )}
              >
                <div className="flex items-center gap-2">
                  <t.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t.label}</span>
                </div>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  {describeChartType(t.type)}
                </p>
              </button>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// One-line summary per chart type. Kept here (not on the registry) so
// the registry stays a thin data structure and the copy can be tuned
// without rewiring the rest of the codebase.
function describeChartType(t: ChartType): string {
  switch (t) {
    case "bar":
      return "Counts or sums grouped into time buckets.";
    case "line":
      return "Continuous values over time.";
    case "area":
      return "Line chart filled under the curve — emphasizes totals.";
    case "scatter":
      return "Two signals as x/y pairs.";
    case "path":
      return "Two signals with connecting lines — good for GPS / trajectory.";
    case "scatter3d":
      return "Three signals as x/y/z pairs (orbit-controllable).";
    case "catbar":
      return "Categorical aggregate — one bar per signal name.";
    case "pie":
      return "Share-of-total across categories.";
  }
}

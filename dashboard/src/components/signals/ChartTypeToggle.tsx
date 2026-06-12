import { cn } from "@/lib/utils";
import { AreaChart, BarChart3, LineChart } from "lucide-react";

export type ChartType = "bar" | "line" | "area";

const OPTIONS: { type: ChartType; icon: typeof BarChart3; title: string }[] = [
  { type: "bar",  icon: BarChart3,  title: "Bar"  },
  { type: "line", icon: LineChart,  title: "Line" },
  { type: "area", icon: AreaChart,  title: "Area" },
];

interface ChartTypeToggleProps {
  value: ChartType;
  onChange: (next: ChartType) => void;
  className?: string;
}

export function ChartTypeToggle({
  value,
  onChange,
  className,
}: ChartTypeToggleProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border bg-background p-0.5",
        className,
      )}
      role="group"
    >
      {OPTIONS.map(({ type, icon: Icon, title }) => {
        const active = value === type;
        return (
          <button
            key={type}
            type="button"
            title={title}
            onClick={() => onChange(type)}
            className={cn(
              "flex h-7 w-8 items-center justify-center rounded-sm text-muted-foreground transition-colors",
              active
                ? "bg-accent text-foreground"
                : "hover:bg-accent/50 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}

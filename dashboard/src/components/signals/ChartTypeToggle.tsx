import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CHART_TYPES,
  CHART_TYPE_MAP,
  type ChartType,
} from "@/components/signals/chartTypes";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

export type { ChartType };

interface ChartTypeSelectProps {
  value: ChartType;
  onChange: (next: ChartType) => void;
  className?: string;
}

/** The chart-type picker: a single labeled "Traces" trigger opens a popover
 *  listing EVERY type as a grid of labeled icons. */
export function ChartTypeSelect({
  value,
  onChange,
  className,
}: ChartTypeSelectProps) {
  const [open, setOpen] = useState(false);
  const { icon: ActiveIcon, label: activeLabel } = CHART_TYPE_MAP[value];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Chart type"
          className={cn(
            "inline-flex h-8 items-center gap-1 rounded-md border bg-background px-2.5 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-accent/50 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring",
            className,
          )}
        >
          <ActiveIcon className="h-4 w-4" />
          <span>{activeLabel}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="end">
        <div className="grid grid-cols-4 gap-1">
          {CHART_TYPES.map(({ type, icon: Icon, label }) => {
            const active = value === type;
            return (
              <button
                key={type}
                type="button"
                title={label}
                onClick={() => {
                  onChange(type);
                  setOpen(false);
                }}
                className={cn(
                  "flex h-16 w-16 flex-col items-center justify-center gap-1.5 rounded-md text-[11px] font-medium leading-none text-muted-foreground transition-colors",
                  active
                    ? "bg-accent text-foreground"
                    : "hover:bg-accent/50 hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

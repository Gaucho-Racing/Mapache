import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CHART_TYPES,
  CHART_TYPE_MAP,
  INLINE_CHART_TYPES,
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

/** The chart-type picker: the primary types (bar/line/area) render as inline
 *  icon buttons; a chevron opens a popover listing EVERY type (the inline three
 *  included) as a grid of labeled icons. The chevron shows the active dropdown
 *  type's icon so a non-inline selection stays visible without opening it. */
export function ChartTypeSelect({
  value,
  onChange,
  className,
}: ChartTypeSelectProps) {
  const [open, setOpen] = useState(false);
  const activeDef = CHART_TYPE_MAP[value];
  const dropdownActive = !activeDef.inline;
  const TriggerIcon = dropdownActive ? activeDef.icon : ChevronDown;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md border bg-background p-1",
        className,
      )}
      role="group"
    >
      {INLINE_CHART_TYPES.map(({ type, icon: Icon, label }) => {
        const active = value === type;
        return (
          <button
            key={type}
            type="button"
            title={label}
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

      <div className="mx-0.5 h-5 w-px bg-border" aria-hidden />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            title="More chart types"
            className={cn(
              "flex h-7 w-8 items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring",
              dropdownActive
                ? "bg-accent text-foreground"
                : "hover:bg-accent/50 hover:text-foreground",
            )}
          >
            <TriggerIcon className="h-4 w-4" />
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
    </div>
  );
}

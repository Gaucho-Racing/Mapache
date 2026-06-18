import { useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { addDays, format, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { parseDayKeys } from "@/lib/date";

interface DateSelectorProps {
  value: Date;
  // YYYY-MM-DD strings that have data, ascending. Used to highlight selectable
  // days in the calendar.
  availableDates: string[];
  onChange: (date: Date) => void;
}

export default function DateSelector({
  value,
  availableDates,
  onChange,
}: DateSelectorProps) {
  const [open, setOpen] = useState(false);

  const withData = parseDayKeys(availableDates);
  const hasData = (d: Date) => withData.some((w) => isSameDay(w, d));

  return (
    <div className="flex items-center justify-center gap-1">
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        onClick={() => onChange(addDays(value, -1))}
        aria-label="Previous day"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="min-w-[10rem] gap-2 font-medium"
          >
            <CalendarIcon className="h-4 w-4 opacity-60" />
            {format(value, "EEE, MMM d, yyyy")}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align="center"
          // Theme react-day-picker's defaults to the dark popover.
          style={
            {
              "--rdp-accent-color": "rgb(236 72 153)",
              "--rdp-background-color": "rgb(38 38 38)",
            } as React.CSSProperties
          }
        >
          <DayPicker
            mode="single"
            selected={value}
            defaultMonth={value}
            onSelect={(d) => {
              if (d) {
                onChange(d);
                setOpen(false);
              }
            }}
            modifiers={{ hasData }}
            modifiersClassNames={{
              hasData: "font-semibold text-gr-pink",
            }}
            className="p-3"
          />
        </PopoverContent>
      </Popover>

      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        onClick={() => onChange(addDays(value, 1))}
        aria-label="Next day"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

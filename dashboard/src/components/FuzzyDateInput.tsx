import { useEffect, useMemo, useState } from "react";
import * as chrono from "chrono-node";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { format } from "date-fns";
import { CalendarIcon, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface FuzzyDateInputProps {
  value?: Date;
  onDateChange: (d: Date) => void;
  // YYYY-MM-DD strings for days that have data. Used to highlight available
  // days in the calendar and to flag a parsed date that has no data.
  availableDates?: string[];
  placeholder?: string;
  className?: string;
}

function toDayKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

// Parse free text into a single Date using chrono. Handled inputs include:
//   "june 6", "6-11", "6/11/2025", "yesterday", "last friday", "2 days ago",
//   "today". chrono.parseDate returns null when nothing resolves.
function parseFuzzy(text: string): Date | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  return chrono.parseDate(trimmed, new Date(), { forwardDate: false });
}

export default function FuzzyDateInput({
  value,
  onDateChange,
  availableDates,
  placeholder = "Jump to a day (e.g. june 6, last friday)",
  className,
}: FuzzyDateInputProps) {
  const [text, setText] = useState(value ? format(value, "MMM d, yyyy") : "");
  const [parsed, setParsed] = useState<Date | null>(value ?? null);
  const [touched, setTouched] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Keep the input text in sync when the controlled value changes from outside
  // (e.g. a calendar pick or a parent reset).
  useEffect(() => {
    if (value) {
      setText(format(value, "MMM d, yyyy"));
      setParsed(value);
    }
  }, [value]);

  const availableSet = useMemo(
    () => new Set(availableDates ?? []),
    [availableDates],
  );

  const availableDayDates = useMemo(
    () =>
      (availableDates ?? []).map((s) => {
        const [y, m, d] = s.split("-").map(Number);
        return new Date(y, m - 1, d);
      }),
    [availableDates],
  );

  const hasData = parsed ? availableSet.has(toDayKey(parsed)) : true;
  const showError = touched && text.trim().length > 0 && !parsed;
  const showNoData =
    touched && parsed != null && availableDates != null && !hasData;

  const commit = () => {
    const d = parseFuzzy(text);
    setParsed(d);
    setTouched(true);
    if (d) {
      setText(format(d, "MMM d, yyyy"));
      onDateChange(d);
    }
  };

  const onTextChange = (next: string) => {
    setText(next);
    setTouched(true);
    setParsed(parseFuzzy(next));
  };

  const handleCalendarSelect = (d?: Date) => {
    if (!d) return;
    setParsed(d);
    setText(format(d, "MMM d, yyyy"));
    setTouched(true);
    setCalendarOpen(false);
    onDateChange(d);
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              }
            }}
            onBlur={commit}
            placeholder={placeholder}
            className="pr-8"
          />
          {text.trim().length > 0 && (
            <button
              type="button"
              aria-label="Clear"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setText("");
                setParsed(null);
                setTouched(false);
              }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Open calendar">
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="end">
            <DayPicker
              mode="single"
              selected={parsed ?? undefined}
              onSelect={handleCalendarSelect}
              defaultMonth={parsed ?? undefined}
              modifiers={{ hasData: availableDayDates }}
              modifiersClassNames={{
                hasData: "font-bold text-primary underline",
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="mt-1 min-h-[1.25rem] text-xs">
        {parsed && (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Check className="h-3 w-3 text-green-500" />
            {format(parsed, "EEEE, MMM d, yyyy")}
            {showNoData && (
              <span className="ml-1 text-amber-500">(no data this day)</span>
            )}
          </span>
        )}
        {showError && (
          <span className="text-destructive">
            Couldn&apos;t understand that date
          </span>
        )}
      </div>
    </div>
  );
}

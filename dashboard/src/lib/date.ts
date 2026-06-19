import { format } from "date-fns";

// Local-day key ("yyyy-MM-dd") in the browser's timezone — matches the day
// strings the backend returns for "days with data". Accepts a Date or an ISO
// timestamp string so the sessions list (ISO) and the date pickers (Date) share
// one implementation.
export function dayKey(d: Date | string): string {
  return format(typeof d === "string" ? new Date(d) : d, "yyyy-MM-dd");
}

// Parse "yyyy-MM-dd" day keys into local Date objects (midnight local), for
// feeding react-day-picker's `hasData` modifier. Built from parts rather than
// `new Date(str)` so the string is read as a local day, not UTC.
export function parseDayKeys(keys: string[]): Date[] {
  return keys.map((s) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  });
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(milliseconds: number) {
  if (milliseconds < 1000) {
    return `${Math.floor(milliseconds)}ms`;
  }

  if (milliseconds < 60000) {
    return `${(milliseconds / 1000).toFixed(2)}s`;
  }

  const minutes = Math.floor(milliseconds / 60000);
  const remainingMs = milliseconds % 60000;
  const seconds = (remainingMs / 1000).toFixed(2);
  return `${minutes}m ${seconds}s`;
}

export function formatTimeWithMillis(date: Date, hour12: boolean = false) {
  const timeStr = date.toLocaleTimeString("en-US", {
    hour12: hour12,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const ms = date.getMilliseconds().toString().padStart(3, "0");
  if (hour12) {
    const [time, ampm] = timeStr.split(" ");
    return `${time}.${ms} ${ampm}`;
  } else {
    return `${timeStr}.${ms}`;
  }
}

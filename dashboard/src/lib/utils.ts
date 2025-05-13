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

export function formatDateMillis(date: Date) {
  const timeStr = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const ms = date.getMilliseconds().toString().padStart(3, "0");
  return `${timeStr}.${ms}`;
}

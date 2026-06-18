import type { Series } from "@/components/signals/QueryChart";

// First slot matches gr-pink so single-series bars keep their color when
// flipping into multi-series. Shared by every signals chart so a label keeps
// one color across the timeseries, plot, and debug renderers.
export const PALETTE = [
  "#e105a3",
  "#8412fc",
  "#10b981",
  "#f59e0b",
  "#3b82f6",
  "#ef4444",
  "#06b6d4",
  "#84cc16",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

/** Resolve an HSL CSS custom property ("H S% L%") to an `hsl(...)` string,
 *  with optional alpha. Falls back to a dark-theme grey (e.g. on SSR). */
export function cssHsl(varName: string, fallback: string, alpha = 1): string {
  if (typeof window === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  if (!raw) return fallback;
  return alpha === 1 ? `hsl(${raw})` : `hsl(${raw} / ${alpha})`;
}

/** Sum every point in a series (nulls = 0) — for top-K ranking and the
 *  categorical bar/slice aggregate value. */
export function seriesTotal(s: Series): number {
  let acc = 0;
  for (const p of s.points) acc += p.value ?? 0;
  return acc;
}

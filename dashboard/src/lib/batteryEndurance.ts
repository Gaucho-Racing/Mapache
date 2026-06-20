// State, persistence, and projection math for the Battery Endurance Tracker
// widget. Kept free of React so the math is unit-testable in isolation.

export interface LapRow {
  lap: number; // 1-based lap number
  tMs: number; // wall-clock time of the snapshot (Date.now())
  elapsedMs: number; // tMs - eventStartMs
  soc: number; // bcu_accumulator_soc value at snapshot (%)
  minV: number; // bcu_min_cell_voltage value at snapshot (V)
  maxT: number; // bcu_max_cell_temp value at snapshot (°C)
  stale: boolean; // live sample was missing/old when captured
}

export interface Thresholds {
  tempMaxC: number; // upper temperature boundary
  socLowPct: number; // low-SOC warning boundary
  socEmptyPct: number; // empty-SOC boundary
  minCellVFloor: number; // lower cell-voltage boundary (graph projection)
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  tempMaxC: 60,
  socLowPct: 20,
  socEmptyPct: 0,
  minCellVFloor: 3.0,
};

export interface EnduranceState {
  eventStartMs: number | null;
  laps: LapRow[];
  thresholds: Thresholds;
}

export const initEnduranceState = (): EnduranceState => ({
  eventStartMs: null,
  laps: [],
  thresholds: { ...DEFAULT_THRESHOLDS },
});

const KEY_PREFIX = "battery_endurance_v1_";

export const enduranceKey = (vehicleId: string): string =>
  `${KEY_PREFIX}${vehicleId}`;

export function loadEndurance(vehicleId: string): EnduranceState {
  try {
    const saved = localStorage.getItem(enduranceKey(vehicleId));
    if (!saved) return initEnduranceState();
    const parsed = JSON.parse(saved) as Partial<EnduranceState>;
    return {
      eventStartMs:
        typeof parsed.eventStartMs === "number" ? parsed.eventStartMs : null,
      laps: Array.isArray(parsed.laps) ? parsed.laps : [],
      thresholds: { ...DEFAULT_THRESHOLDS, ...(parsed.thresholds ?? {}) },
    };
  } catch {
    return initEnduranceState();
  }
}

export function saveEndurance(vehicleId: string, state: EnduranceState): void {
  try {
    localStorage.setItem(enduranceKey(vehicleId), JSON.stringify(state));
  } catch {
    // Quota or serialization failure — non-fatal, in-memory state stands.
  }
}

export interface Regression {
  slope: number;
  intercept: number;
  n: number;
}

// Ordinary least-squares fit of y = slope·x + intercept. Returns null when
// there are fewer than two points or x has zero variance (vertical line).
export function linearRegression(
  points: { x: number; y: number }[],
): Regression | null {
  const pts = points.filter(
    (p) => Number.isFinite(p.x) && Number.isFinite(p.y),
  );
  const n = pts.length;
  if (n < 2) return null;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  for (const p of pts) {
    sx += p.x;
    sy += p.y;
    sxx += p.x * p.x;
    sxy += p.x * p.y;
  }
  const denom = n * sxx - sx * sx;
  if (denom === 0) return null;
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept, n };
}

// x at which the regression line reaches boundaryY. null when the line is flat.
export function crossX(reg: Regression, boundaryY: number): number | null {
  if (reg.slope === 0) return null;
  return (boundaryY - reg.intercept) / reg.slope;
}

export type TrendDirection = "up" | "down";

// Mean per-lap delta over the trailing window (last k consecutive deltas).
export function meanPerLapDelta(values: number[], k = 3): number | null {
  if (values.length < 2) return null;
  const deltas: number[] = [];
  for (let i = 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    if (Number.isFinite(d)) deltas.push(d);
  }
  const recent = deltas.slice(-k);
  if (recent.length === 0) return null;
  return recent.reduce((a, b) => a + b, 0) / recent.length;
}

// Laps until `current` reaches `boundary`, from the trailing per-lap rate.
// Returns null when there isn't enough data or the trend moves away from the
// boundary; 0 when the boundary is already reached/crossed.
export function projectLapsUntil(
  values: number[],
  boundary: number,
  direction: TrendDirection,
  k = 3,
): number | null {
  if (values.length < 2) return null;
  const current = values[values.length - 1];
  if (!Number.isFinite(current)) return null;
  const rate = meanPerLapDelta(values, k);
  if (rate == null || !Number.isFinite(rate)) return null;

  if (direction === "down") {
    if (current <= boundary) return 0;
    if (rate >= 0) return null; // not falling — never reaches a lower boundary
    return (current - boundary) / -rate;
  }
  if (current >= boundary) return 0;
  if (rate <= 0) return null; // not rising — never reaches an upper boundary
  return (boundary - current) / rate;
}

export interface Stats {
  min: number;
  max: number;
  avg: number;
}

export function summarize(values: number[]): Stats | null {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return null;
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  for (const v of finite) {
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }
  return { min, max, avg: sum / finite.length };
}

// "m:ss" from a duration in ms. Negative/NaN clamp to 0:00.
export function formatElapsed(ms: number): string {
  const safe = Number.isFinite(ms) && ms > 0 ? ms : 0;
  const totalSec = Math.floor(safe / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

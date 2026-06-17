// GPS outlier detection for the lap editor. Lat/lon telemetry occasionally
// carries "bus noise" — numeric, in-range readings that sit far from the real
// track. Both normalization modes (geo.ts) derive their frame from the data, so
// one far-off point collapses the path and shoots a stray line out to it. We
// flag those points client-side before normalization, mirroring the signals
// page's rejection model (z-score beyond N sigma OR outside a hard limit).

import { GeoPoint } from "@/models/session";

export interface OutlierConfig {
  sigmaOn: boolean;
  sigmaN: number;
  maxDistanceM: number | null; // null = max-distance limit off
}

export const DEFAULT_OUTLIER_CONFIG: OutlierConfig = {
  sigmaOn: true,
  sigmaN: 3,
  maxDistanceM: null,
};

// Same lat-scaled degree factors used by geo.ts localCartesian.
const M_PER_DEG_LAT = 111_132.0;
const M_PER_DEG_LON_EQ = 111_320.0;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

// Population mean + standard deviation, matching the signals page's stddevPop.
function meanStd(values: number[]): { mean: number; std: number } {
  const n = values.length;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const variance =
    values.reduce((s, v) => s + (v - mean) * (v - mean), 0) / n;
  return { mean, std: Math.sqrt(variance) };
}

// Returns a boolean[] parallel to `points` (true = outlier).
export function detectOutliers(
  points: GeoPoint[],
  cfg: OutlierConfig,
): boolean[] {
  const flags = new Array(points.length).fill(false);
  if (points.length === 0) return flags;
  if (!cfg.sigmaOn && cfg.maxDistanceM == null) return flags;

  const lats = points.map((p) => p.lat);
  const lons = points.map((p) => p.lon);

  const latStat = cfg.sigmaOn ? meanStd(lats) : null;
  const lonStat = cfg.sigmaOn ? meanStd(lons) : null;

  // Robust center for the distance limit; meters scaled at that latitude.
  const useDistance = cfg.maxDistanceM != null && cfg.maxDistanceM > 0;
  const latC = useDistance ? median(lats) : 0;
  const lonC = useDistance ? median(lons) : 0;
  const mPerDegLon = M_PER_DEG_LON_EQ * Math.cos((latC * Math.PI) / 180);

  for (let i = 0; i < points.length; i++) {
    const p = points[i];

    if (latStat && lonStat) {
      // std === 0 means a degenerate axis (all identical) — not an outlier,
      // matching the signals page's nullIf(_std, 0) guard.
      const zLat = latStat.std > 0 ? Math.abs(p.lat - latStat.mean) / latStat.std : 0;
      const zLon = lonStat.std > 0 ? Math.abs(p.lon - lonStat.mean) / lonStat.std : 0;
      if (zLat > cfg.sigmaN || zLon > cfg.sigmaN) {
        flags[i] = true;
        continue;
      }
    }

    if (useDistance) {
      const dx = (p.lon - lonC) * mPerDegLon;
      const dy = (p.lat - latC) * M_PER_DEG_LAT;
      if (Math.hypot(dx, dy) > (cfg.maxDistanceM as number)) {
        flags[i] = true;
      }
    }
  }

  return flags;
}

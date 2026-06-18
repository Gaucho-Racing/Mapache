// GPS outlier detection for the lap editor. Lat/lon telemetry occasionally
// carries "bus noise" — numeric, in-range readings that sit far from the real
// track. Both normalization modes (geo.ts) derive their frame from the data, so
// one far-off point collapses the path and shoots a stray line out to it. We
// flag those points client-side before normalization.
//
// The detector is a robust 2-D radial test: convert each point's offset from
// the *median* centroid into meters (equal-scale, via geo.ts), take its radial
// distance, then compare against the median distance plus N robust sigmas, where
// the spread is the MAD (median absolute deviation) of the distances scaled by
// 1.4826 (the normal-consistency constant, so N stays comparable to a z-score).
// Median + MAD are used instead of mean + std so the outliers don't inflate the
// thresholds that are meant to catch them. A separate hard meter limit remains.

import { GeoPoint } from "@/models/session";
import { M_PER_DEG_LAT, mPerDegLon } from "./geo";

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

// Scales MAD to a normal-consistent estimate of the standard deviation, so
// sigmaN reads like a z-score threshold (≈ the old per-axis sigma semantics).
const MAD_TO_SIGMA = 1.4826;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

// Median absolute deviation about `center` (a robust spread measure).
function mad(values: number[], center: number): number {
  return median(values.map((v) => Math.abs(v - center)));
}

// Returns a boolean[] parallel to `points` (true = outlier).
export function detectOutliers(
  points: GeoPoint[],
  cfg: OutlierConfig,
): boolean[] {
  const flags = new Array(points.length).fill(false);
  if (points.length === 0) return flags;
  if (!cfg.sigmaOn && cfg.maxDistanceM == null) return flags;

  // Robust center: median of each axis. Meters are scaled at that latitude so
  // dx/dy share one metric frame (matching geo.ts localCartesian).
  const latC = median(points.map((p) => p.lat));
  const lonC = median(points.map((p) => p.lon));
  const mLon = mPerDegLon(latC);

  // Radial distance (m) of each point from the median centroid.
  const dist = points.map((p) => {
    const dx = (p.lon - lonC) * mLon;
    const dy = (p.lat - latC) * M_PER_DEG_LAT;
    return Math.hypot(dx, dy);
  });

  // Robust radial threshold. A degenerate spread (MAD === 0, e.g. a tight or
  // stationary track) disables the sigma test rather than flagging everything —
  // mirroring the old std===0 guard. The hard meter limit still applies.
  let sigmaThreshold = Infinity;
  if (cfg.sigmaOn) {
    const distMedian = median(dist);
    const distScale = MAD_TO_SIGMA * mad(dist, distMedian);
    if (distScale > 0) {
      sigmaThreshold = distMedian + cfg.sigmaN * distScale;
    }
  }

  const useDistance = cfg.maxDistanceM != null && cfg.maxDistanceM > 0;
  const hardLimit = useDistance ? (cfg.maxDistanceM as number) : Infinity;

  for (let i = 0; i < points.length; i++) {
    if (dist[i] > sigmaThreshold || dist[i] > hardLimit) {
      flags[i] = true;
    }
  }

  return flags;
}

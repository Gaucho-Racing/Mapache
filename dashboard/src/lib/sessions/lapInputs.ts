import type { LapResult, Point } from "@/models/session";
import type { LapInput } from "@/lib/sessions/api";

/** Convert a point's epoch-seconds timestamp into an ISO string for the API. */
export function tsToIso(tsSeconds: number): string {
  return new Date(tsSeconds * 1000).toISOString();
}

// Derive the persisted lap shape from the lap-engine result. `crossingIndices`
// are the filtered S/F crossings, so lap k spans points[crossingIndices[k]] →
// points[crossingIndices[k+1]], and lapTimes[k] is that span's duration (s).
// Sector splits within a lap come from transitions in `sectorNumbers` between
// those two crossings; each sector's duration is the time between its boundary
// crossings (or the lap's start/end at the edges).
export function deriveLapInputs(result: LapResult, points: Point[]): LapInput[] {
  const { crossingIndices, lapTimes, bestTime, sectorNumbers } = result;
  if (crossingIndices.length < 2) return [];

  // Flag only the first lap whose time equals the minimum, so tied-best laps
  // don't both get is_best.
  const bestLapIdx = lapTimes.findIndex((t) => t === bestTime);

  const laps: LapInput[] = [];
  for (let k = 0; k < crossingIndices.length - 1; k++) {
    const startIdx = crossingIndices[k];
    const endIdx = crossingIndices[k + 1];
    const startTs = points[startIdx].ts;
    const endTs = points[endIdx].ts;
    const durationS = lapTimes[k] ?? endTs - startTs;

    // Sector boundaries inside this lap: indices where the sector number
    // changes. The lap opens with whatever sector is active at startIdx.
    const sectors: { sector_number: number; duration_ms: number }[] = [];
    let segStartIdx = startIdx;
    let segSector = sectorNumbers[startIdx] || 1;
    for (let i = startIdx + 1; i <= endIdx; i++) {
      const sec = sectorNumbers[i] || 0;
      if (sec !== segSector || i === endIdx) {
        const segEndIdx = i;
        const durMs = (points[segEndIdx].ts - points[segStartIdx].ts) * 1000;
        if (segSector > 0 && durMs > 0) {
          sectors.push({
            sector_number: segSector,
            duration_ms: Math.round(durMs),
          });
        }
        segStartIdx = segEndIdx;
        segSector = sec;
      }
    }

    laps.push({
      lap_number: k + 1,
      start_time: tsToIso(startTs),
      end_time: tsToIso(endTs),
      duration_ms: Math.round(durationS * 1000),
      is_best: k === bestLapIdx,
      sectors,
    });
  }
  return laps;
}

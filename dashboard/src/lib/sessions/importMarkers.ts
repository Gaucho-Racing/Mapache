import type { Transform } from "@/lib/sessions/geo";
import { NAME_TO_SEGMENT } from "@/lib/sessions/segments";
import type { Vec2 } from "@/lib/sessions/intersect";

/** Lat/lon bounding box of the target track's cropped window. */
export interface GeoBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export interface ReprojectResult {
  /** Imported segment lines in the target's normalized XY space, keyed by
   *  segment number. */
  projected: Record<number, Vec2[]>;
  /** Whether any imported point landed inside the (padded) target bounds. */
  overlaps: boolean;
}

/**
 * Re-project a source session's marker segments into the target session's
 * normalized space. Source segments live in the source's normalized space, whose
 * params aren't persisted, so the round-trip is source XY -> geo (via the
 * source's transform) -> target XY (via the target's transform). A point counts
 * as overlapping when it falls within the target's cropped bounds padded by 15%
 * of each span (min 1e-4 deg). Only the first two points of each segment are
 * used (a marker line). Pure — no fetching or state mutation.
 */
export function reprojectImportedSegments(
  segments: Record<string, number[][]>,
  srcT: Transform,
  tgtT: Transform,
  bounds: GeoBounds | null,
): ReprojectResult {
  const latPad = bounds ? (bounds.maxLat - bounds.minLat) * 0.15 || 1e-4 : 0;
  const lonPad = bounds ? (bounds.maxLon - bounds.minLon) * 0.15 || 1e-4 : 0;

  const projected: Record<number, Vec2[]> = {};
  let overlaps = false;
  for (const [name, pts] of Object.entries(segments || {})) {
    const n = NAME_TO_SEGMENT[name];
    if (n === undefined) continue;
    projected[n] = [];
    for (const pt of pts.slice(0, 2)) {
      const { lat, lon } = srcT.toGeo(Number(pt[0]), Number(pt[1]));
      if (
        bounds &&
        lat >= bounds.minLat - latPad &&
        lat <= bounds.maxLat + latPad &&
        lon >= bounds.minLon - lonPad &&
        lon <= bounds.maxLon + lonPad
      ) {
        overlaps = true;
      }
      projected[n].push(tgtT.toXY(lat, lon));
    }
  }

  return { projected, overlaps };
}

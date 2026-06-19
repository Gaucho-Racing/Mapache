// Coordinate normalization for GPS data.

import { GeoPoint, NormMode, Point } from "@/models/session";
import { Vec2 } from "./intersect";

// Meters-per-degree at the equator. Latitude is ~constant; longitude shrinks by
// cos(lat). Shared by the local-cartesian transform and the outlier detector so
// both convert degrees to meters the same way.
export const M_PER_DEG_LAT = 111_132.0;
export const M_PER_DEG_LON_EQ = 111_320.0;

// Meters per degree of longitude at a given latitude.
export function mPerDegLon(latDeg: number): number {
  return M_PER_DEG_LON_EQ * Math.cos((latDeg * Math.PI) / 180);
}

// A reversible mapping between geographic lat/lon and the normalized canvas
// space for a given set of points. The normalization params (centroid) are
// derived once from `points`; not persisted, so re-deriving the transform is the
// only way to move geometry between sessions. Note x=lon, y=lat.
export interface Transform {
  toXY(lat: number, lon: number): Vec2;
  toGeo(x: number, y: number): { lat: number; lon: number };
}

// Local cartesian is the only metric (equal-scale) transform, so it's the only
// one that registers against the satellite underlay. The `mode` argument is kept
// for the call sites / persisted norm_mode, but every value resolves here:
// legacy WGS84 / Custom-scale analyses were anamorphic and are intentionally
// remapped to local cartesian.
export function buildTransform(points: GeoPoint[], _mode?: NormMode): Transform {
  return localCartesianTransform(points);
}

export function normalizeCoordinates(
  points: GeoPoint[],
  mode: NormMode,
): Point[] {
  if (points.length === 0) return [];
  const t = buildTransform(points, mode);
  return points.map((p) => {
    const [x, y] = t.toXY(p.lat, p.lon);
    return { x, y, ts: p.ts };
  });
}

// Convert lat/lon to meters relative to the centroid.
function localCartesianTransform(points: GeoPoint[]): Transform {
  const n = points.length || 1;
  const latC = points.reduce((s, p) => s + p.lat, 0) / n;
  const lonC = points.reduce((s, p) => s + p.lon, 0) / n;

  const mLat = M_PER_DEG_LAT;
  const mLon = mPerDegLon(latC);

  return {
    toXY: (lat, lon) => [(lon - lonC) * mLon, (lat - latC) * mLat],
    toGeo: (x, y) => ({
      lat: latC + y / mLat,
      lon: lonC + x / mLon,
    }),
  };
}

// Coordinate normalization for GPS data.

import { GeoPoint, NormMode, Point } from "@/models/session";
import { Vec2 } from "./intersect";

// A reversible mapping between geographic lat/lon and the normalized canvas
// space for a given set of points + mode. The normalization params (centroid /
// min-max) are derived once from `points`; not persisted, so re-deriving the
// transform is the only way to move geometry between sessions. Note x=lon, y=lat.
export interface Transform {
  toXY(lat: number, lon: number): Vec2;
  toGeo(x: number, y: number): { lat: number; lon: number };
}

export function buildTransform(points: GeoPoint[], mode: NormMode): Transform {
  switch (mode) {
    case NormMode.WGS84:
      return wgs84Transform();
    case NormMode.LocalCartesian:
      return localCartesianTransform(points);
    default:
      return customScaleTransform(points);
  }
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

// Passthrough — use lon/lat directly as x/y.
function wgs84Transform(): Transform {
  return {
    toXY: (lat, lon) => [lon, lat],
    toGeo: (x, y) => ({ lat: y, lon: x }),
  };
}

// Convert lat/lon to meters relative to the centroid.
function localCartesianTransform(points: GeoPoint[]): Transform {
  const n = points.length || 1;
  const latC = points.reduce((s, p) => s + p.lat, 0) / n;
  const lonC = points.reduce((s, p) => s + p.lon, 0) / n;

  const latRad = (latC * Math.PI) / 180;
  const mPerDegLat = 111_132.0;
  const mPerDegLon = 111_320.0 * Math.cos(latRad);

  return {
    toXY: (lat, lon) => [(lon - lonC) * mPerDegLon, (lat - latC) * mPerDegLat],
    toGeo: (x, y) => ({
      lat: latC + y / mPerDegLat,
      lon: lonC + x / mPerDegLon,
    }),
  };
}

// Auto-scale coordinates to [0, 1] based on data min/max.
function customScaleTransform(points: GeoPoint[]): Transform {
  let latMin = Infinity,
    latMax = -Infinity,
    lonMin = Infinity,
    lonMax = -Infinity;
  for (const p of points) {
    if (p.lat < latMin) latMin = p.lat;
    if (p.lat > latMax) latMax = p.lat;
    if (p.lon < lonMin) lonMin = p.lon;
    if (p.lon > lonMax) lonMax = p.lon;
  }
  const latRange = latMax - latMin || 1.0;
  const lonRange = lonMax - lonMin || 1.0;

  return {
    toXY: (lat, lon) => [(lon - lonMin) / lonRange, (lat - latMin) / latRange],
    toGeo: (x, y) => ({
      lat: latMin + y * latRange,
      lon: lonMin + x * lonRange,
    }),
  };
}

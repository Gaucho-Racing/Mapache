// Coordinate normalization for GPS data.

import { GeoPoint, NormMode, Point } from "@/models/lapache";

export function normalizeCoordinates(
  points: GeoPoint[],
  mode: NormMode,
): Point[] {
  if (points.length === 0) return [];
  switch (mode) {
    case NormMode.WGS84:
      return wgs84(points);
    case NormMode.LocalCartesian:
      return localCartesian(points);
    default:
      return customScale(points);
  }
}

// Passthrough — use lon/lat directly as x/y.
function wgs84(points: GeoPoint[]): Point[] {
  return points.map((p) => ({ x: p.lon, y: p.lat, ts: p.ts }));
}

// Convert lat/lon to meters relative to the centroid.
function localCartesian(points: GeoPoint[]): Point[] {
  const n = points.length;
  const latC = points.reduce((s, p) => s + p.lat, 0) / n;
  const lonC = points.reduce((s, p) => s + p.lon, 0) / n;

  const latRad = (latC * Math.PI) / 180;
  const mPerDegLat = 111_132.0;
  const mPerDegLon = 111_320.0 * Math.cos(latRad);

  return points.map((p) => ({
    x: (p.lon - lonC) * mPerDegLon,
    y: (p.lat - latC) * mPerDegLat,
    ts: p.ts,
  }));
}

// Auto-scale coordinates to [0, 1] based on data min/max.
function customScale(points: GeoPoint[]): Point[] {
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

  return points.map((p) => ({
    x: (p.lon - lonMin) / lonRange,
    y: (p.lat - latMin) / latRange,
    ts: p.ts,
  }));
}

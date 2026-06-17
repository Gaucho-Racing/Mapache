// Lap detection and sector assignment using segment-line intersections.

import { emptyLapResult, LapResult, Point } from "@/models/session";
import { segmentsIntersect, Vec2 } from "./intersect";
import { SegmentManager } from "./segments";

const MIN_LAP_TIME = 1.0; // seconds — crossings faster than this are spurious

export function processLaps(points: Point[], segMgr: SegmentManager): LapResult {
  const n = points.length;
  if (n < 2 || !segMgr.hasStartFinish()) {
    return emptyLapResult(n);
  }

  const sf = segMgr.points(1);
  const s1 = sf[0];
  const s2 = sf[1];

  // Find all crossing indices.
  const crossings: number[] = [];
  for (let i = 1; i < n; i++) {
    const p1: Vec2 = [points[i - 1].x, points[i - 1].y];
    const p2: Vec2 = [points[i].x, points[i].y];
    if (segmentsIntersect(p1, p2, s1, s2) !== null) crossings.push(i);
  }

  // Filter spurious crossings (too close together in time).
  const filtered: number[] = [];
  for (const ci of crossings) {
    if (filtered.length === 0) {
      filtered.push(ci);
      continue;
    }
    const dt = points[ci].ts - points[filtered[filtered.length - 1]].ts;
    if (dt >= MIN_LAP_TIME) filtered.push(ci);
  }

  // Lap times.
  const lapTimes: number[] = [];
  for (let i = 1; i < filtered.length; i++) {
    lapTimes.push(points[filtered[i]].ts - points[filtered[i - 1]].ts);
  }

  const lapCount = lapTimes.length;
  let bestTime = 0,
    worstTime = 0,
    avgTime = 0;
  if (lapTimes.length > 0) {
    bestTime = Math.min(...lapTimes);
    worstTime = Math.max(...lapTimes);
    avgTime = lapTimes.reduce((a, b) => a + b, 0) / lapTimes.length;
  }

  // Per-point lap number.
  const lapNumbers = new Array(n).fill(0);
  for (let lapIdx = 0; lapIdx < filtered.length - 1; lapIdx++) {
    for (let j = filtered[lapIdx]; j < filtered[lapIdx + 1]; j++) {
      lapNumbers[j] = lapIdx + 1;
    }
  }
  if (filtered.length > 0) {
    for (let j = filtered[filtered.length - 1]; j < n; j++) {
      lapNumbers[j] = filtered.length;
    }
  }

  return {
    lapCount,
    lapTimes,
    bestTime,
    avgTime,
    worstTime,
    lapNumbers,
    sectorNumbers: computeSectorAssignments(points, segMgr),
    crossingIndices: filtered,
  };
}

export function computeSectorAssignments(
  points: Point[],
  segMgr: SegmentManager,
): number[] {
  const n = points.length;
  const sectors = new Array(n).fill(0);
  const defined = segMgr.definedSegments();

  const boundarySegs = defined.filter((s) => s >= 2).sort((a, b) => a - b);
  if (boundarySegs.length === 0) {
    return new Array(n).fill(1);
  }

  // S/F starts sector 1, boundary seg 2 starts sector 2, etc.
  const segToSector: Record<number, number> = {};
  boundarySegs.forEach((segN, idx) => {
    segToSector[segN] = idx + 2;
  });

  const events: [number, number][] = []; // (point index, new sector)
  for (const segN of boundarySegs) {
    const pts = segMgr.points(segN);
    const a = pts[0];
    const b = pts[1];
    for (let i = 1; i < n; i++) {
      const p1: Vec2 = [points[i - 1].x, points[i - 1].y];
      const p2: Vec2 = [points[i].x, points[i].y];
      if (segmentsIntersect(p1, p2, a, b) !== null) {
        events.push([i, segToSector[segN]]);
      }
    }
  }

  // S/F crossings reset to sector 1.
  if (segMgr.hasStartFinish()) {
    const sf = segMgr.points(1);
    const a = sf[0];
    const b = sf[1];
    for (let i = 1; i < n; i++) {
      const p1: Vec2 = [points[i - 1].x, points[i - 1].y];
      const p2: Vec2 = [points[i].x, points[i].y];
      if (segmentsIntersect(p1, p2, a, b) !== null) events.push([i, 1]);
    }
  }

  events.sort((e1, e2) => e1[0] - e2[0]);

  let currentSector = 0;
  let eventIdx = 0;
  for (let i = 0; i < n; i++) {
    while (eventIdx < events.length && events[eventIdx][0] <= i) {
      currentSector = events[eventIdx][1];
      eventIdx++;
    }
    sectors[i] = currentSector;
  }

  return sectors;
}

// Segment manager for lap-timing lines: up to 9 segments, each defined by 0-2
// geo-coordinate points. Segment 1 is the Start/Finish line; 2-9 are sector
// boundaries.

import { Vec2 } from "./intersect";

const MAX_UNDO = 50;
const NUM_SEGMENTS = 9;

export const SEGMENT_NAMES: Record<number, string> = { 1: "S/F" };
for (let i = 2; i <= NUM_SEGMENTS; i++) SEGMENT_NAMES[i] = `S${i - 1}`;

export const NAME_TO_SEGMENT: Record<string, number> = Object.fromEntries(
  Object.entries(SEGMENT_NAMES).map(([n, name]) => [name, Number(n)]),
);

type SegmentMap = Record<number, Vec2[]>;

function emptySegments(): SegmentMap {
  const m: SegmentMap = {};
  for (let i = 1; i <= NUM_SEGMENTS; i++) m[i] = [];
  return m;
}

function clone(m: SegmentMap): SegmentMap {
  const out: SegmentMap = {};
  for (const k of Object.keys(m)) {
    const n = Number(k);
    out[n] = m[n].map((p) => [p[0], p[1]] as Vec2);
  }
  return out;
}

export class SegmentManager {
  private segments: SegmentMap = emptySegments();
  private activeSeg = 1;
  private dirtyFlag = false;
  private undoStack: SegmentMap[] = [];
  private redoStack: SegmentMap[] = [];

  get active(): number {
    return this.activeSeg;
  }

  get activeName(): string {
    return SEGMENT_NAMES[this.activeSeg];
  }

  get dirty(): boolean {
    return this.dirtyFlag;
  }

  setDirty(val: boolean): void {
    this.dirtyFlag = val;
  }

  setActive(n: number): void {
    if (n >= 1 && n <= NUM_SEGMENTS) this.activeSeg = n;
  }

  points(n: number): Vec2[] {
    return this.segments[n] ?? [];
  }

  activePoints(): Vec2[] {
    return this.segments[this.activeSeg];
  }

  allSegments(): SegmentMap {
    return this.segments;
  }

  addPoint(geoPos: Vec2): boolean {
    const pts = this.segments[this.activeSeg];
    if (pts.length >= 2) return false;
    this.pushUndo();
    pts.push(geoPos);
    this.dirtyFlag = true;
    return true;
  }

  // Remove the closest point across all segments within `threshold` geo units.
  removeNearest(geoPos: Vec2, threshold: number): boolean {
    let bestDist = threshold;
    let bestSeg: number | null = null;
    let bestIdx: number | null = null;

    for (let segN = 1; segN <= NUM_SEGMENTS; segN++) {
      const pts = this.segments[segN];
      for (let idx = 0; idx < pts.length; idx++) {
        const dx = pts[idx][0] - geoPos[0];
        const dy = pts[idx][1] - geoPos[1];
        const dist = Math.hypot(dx, dy);
        if (dist < bestDist) {
          bestDist = dist;
          bestSeg = segN;
          bestIdx = idx;
        }
      }
    }

    if (bestSeg !== null && bestIdx !== null) {
      this.pushUndo();
      this.segments[bestSeg].splice(bestIdx, 1);
      this.dirtyFlag = true;
      return true;
    }
    return false;
  }

  hasStartFinish(): boolean {
    return this.segments[1].length === 2;
  }

  definedSegments(): number[] {
    const out: number[] = [];
    for (let n = 1; n <= NUM_SEGMENTS; n++) {
      if (this.segments[n].length === 2) out.push(n);
    }
    return out;
  }

  undo(): boolean {
    if (this.undoStack.length === 0) return false;
    this.redoStack.push(clone(this.segments));
    if (this.redoStack.length > MAX_UNDO) this.redoStack.shift();
    this.segments = this.undoStack.pop()!;
    this.dirtyFlag = true;
    return true;
  }

  redo(): boolean {
    if (this.redoStack.length === 0) return false;
    this.undoStack.push(clone(this.segments));
    if (this.undoStack.length > MAX_UNDO) this.undoStack.shift();
    this.segments = this.redoStack.pop()!;
    this.dirtyFlag = true;
    return true;
  }

  clear(): void {
    this.pushUndo();
    this.segments = emptySegments();
    this.dirtyFlag = true;
  }

  // Restore segment points from a saved payload (name -> [[x,y], ...]).
  loadFromPayload(payload: Record<string, number[][]>): void {
    this.segments = emptySegments();
    for (const [name, pts] of Object.entries(payload)) {
      const n = NAME_TO_SEGMENT[name];
      if (n === undefined) continue;
      for (const pt of pts.slice(0, 2)) {
        if (Array.isArray(pt) && pt.length === 2) {
          this.segments[n].push([Number(pt[0]), Number(pt[1])]);
        }
      }
    }
    this.activeSeg = 1;
    this.dirtyFlag = false;
    this.undoStack = [];
    this.redoStack = [];
  }

  // Replace segments with an already-projected map (segment index -> points),
  // marking dirty so the user re-processes laps. Resets edit history.
  importSegments(map: SegmentMap): void {
    this.segments = emptySegments();
    for (let n = 1; n <= NUM_SEGMENTS; n++) {
      const pts = map[n];
      if (!pts) continue;
      for (const pt of pts.slice(0, 2)) {
        this.segments[n].push([Number(pt[0]), Number(pt[1])]);
      }
    }
    this.activeSeg = 1;
    this.dirtyFlag = true;
    this.undoStack = [];
    this.redoStack = [];
  }

  // Serialize defined segments for saving (only segments with points).
  toPayload(): Record<string, number[][]> {
    const out: Record<string, number[][]> = {};
    for (let n = 1; n <= NUM_SEGMENTS; n++) {
      const pts = this.segments[n];
      if (pts.length > 0) {
        out[SEGMENT_NAMES[n]] = pts.map((p) => [p[0], p[1]]);
      }
    }
    return out;
  }

  private pushUndo(): void {
    this.undoStack.push(clone(this.segments));
    if (this.undoStack.length > MAX_UNDO) this.undoStack.shift();
    this.redoStack = [];
  }
}

// Types for the Lapache lap-analysis tool (web port of the PyQt desktop app).

export enum NormMode {
  WGS84 = "WGS84",
  LocalCartesian = "Local cartesian",
  CustomScale = "Custom scale",
}

// A raw GPS sample fetched from the telemetry API.
export interface GeoPoint {
  lat: number;
  lon: number;
  ts: number; // epoch seconds
}

// A normalized point in the canvas coordinate space.
export interface Point {
  x: number;
  y: number;
  ts: number; // epoch seconds
}

// Lapache has two modes: "lap" sessions data off a GPS track and detects laps;
// "calibration" plots arbitrary signals against time (for runs without usable
// GPS) and only trims a session window.
export type LapacheMode = "lap" | "calibration";

// One row of the calibration time series: a timestamp plus one numeric value
// per selected signal (signal id -> value).
export interface SignalSample {
  ts: number; // epoch seconds
  [signal: string]: number;
}

export interface SignalConfig {
  latField: string;
  lonField: string;
  normMode: NormMode;
}

export interface LapResult {
  lapCount: number;
  lapTimes: number[];
  bestTime: number;
  avgTime: number;
  worstTime: number;
  lapNumbers: number[]; // per-point lap assignment (same length as points)
  sectorNumbers: number[]; // per-point sector assignment
  crossingIndices: number[]; // indices where the track crosses the S/F line
}

export const emptyLapResult = (n: number): LapResult => ({
  lapCount: 0,
  lapTimes: [],
  bestTime: 0,
  avgTime: 0,
  worstTime: 0,
  lapNumbers: new Array(n).fill(0),
  sectorNumbers: new Array(n).fill(0),
  crossingIndices: [],
});

// A contiguous block of raw signal data (from GET /query/clusters).
export interface DataCluster {
  vehicle_id: string;
  start_time: string;
  end_time: string;
}

// The analysis result blob persisted on a Session (matches the Go/Python schema).
export interface AnalysisPayload {
  lat_field: string;
  lon_field: string;
  norm_mode: string;
  crop_start_ts: number;
  crop_end_ts: number;
  // segment name ("S/F", "S1", ...) -> list of [x, y] coordinate pairs
  segments: Record<string, number[][]>;
  laps: { lap: number; total: number }[];
  summary: { count: number; best: number; avg: number; worst: number };
}

export interface Session {
  id: string;
  vehicle_id: string;
  name: string;
  description: string;
  start_time: string;
  end_time: string;
  // The backend defaults this to an empty object ({}) for un-analyzed
  // sessions, not null. Use hasAnalysis() to tell the two apart.
  analysis: AnalysisPayload | Record<string, never> | null;
}

// True only when a session carries a real, populated analysis result.
// An un-analyzed session comes back as {} (a truthy empty object), so a
// plain truthiness check is not enough — key off a required field.
export function hasAnalysis(
  analysis: Session["analysis"] | undefined,
): analysis is AnalysisPayload {
  return !!analysis && !!(analysis as AnalysisPayload).lat_field;
}

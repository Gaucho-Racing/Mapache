// Types for the Sessions lap-analysis tool.

// Only Local cartesian is metric (equal-scale meters from the centroid), so it
// registers correctly against the satellite underlay. The old WGS84 / Custom
// scale modes stretched lat/lon independently (anamorphic) and misregistered
// the basemap, so they were removed. Legacy analyses with those norm_mode
// strings fall back to Local cartesian (see geo.buildTransform).
export enum NormMode {
  LocalCartesian = "Local cartesian",
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

// Two modes: "lap" sessions data off a GPS track and detects laps;
// "calibration" plots arbitrary signals against time (for runs without usable
// GPS) and only trims a session window.
export type SessionMode = "lap" | "calibration";

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

// The analysis result blob persisted on a Session. Holds only the geometry
// needed to restore/import the editor; lap times and the summary are NOT stored
// here — the session_lap table is canonical (read via fetchSessionLaps and the
// backend-aggregated lap_summary).
export interface AnalysisPayload {
  lat_field: string;
  lon_field: string;
  norm_mode: string;
  crop_start_ts: number;
  crop_end_ts: number;
  // segment name ("S/F", "S1", ...) -> list of [x, y] coordinate pairs
  segments: Record<string, number[][]>;
}

// A single sector split within a lap (matches the Go JSON contract).
export interface Sector {
  id: string;
  lap_id: string;
  session_id: string;
  sector_number: number;
  duration_ms: number;
}

// A detected lap persisted on the backend (matches the Go JSON contract).
export interface Lap {
  id: string;
  session_id: string;
  lap_number: number;
  start_time: string;
  end_time: string;
  duration_ms: number;
  is_best: boolean;
  created_at: string;
  sectors: Sector[];
}

// Aggregate lap statistics for a session (matches the Go JSON contract).
export interface LapSummary {
  count: number;
  best_ms: number;
  avg_ms: number;
  worst_ms: number;
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
  laps?: Lap[];
  lap_summary?: LapSummary | null;
}

// True only when a session carries a real, populated analysis result.
// An un-analyzed session comes back as {} (a truthy empty object), so a
// plain truthiness check is not enough — key off a required field.
export function hasAnalysis(
  analysis: Session["analysis"] | undefined,
): analysis is AnalysisPayload {
  return !!analysis && !!(analysis as AnalysisPayload).lat_field;
}

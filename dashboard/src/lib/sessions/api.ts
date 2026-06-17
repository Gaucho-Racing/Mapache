// HTTP client for the sessions lap-analysis tool. Replaces the desktop app's
// direct DB access with the Mapache gateway APIs. The gateway wraps each
// service response once under a `data` key, so Go endpoints (bare body) read as
// response.data.data and the Python query endpoints ({data: ...}) read as
// response.data.data.data.

import axios from "axios";
import { BACKEND_URL } from "@/consts/config";
import {
  AnalysisPayload,
  DataCluster,
  GeoPoint,
  Lap,
  Session,
  SignalSample,
} from "@/models/session";

function authHeaders() {
  return {
    Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
  };
}

// Query endpoints reject a trailing "Z"; the desktop app passed naive strings.
function stripZ(ts: string): string {
  return ts.endsWith("Z") ? ts.slice(0, -1) : ts;
}

// The browser's IANA timezone, so the backend buckets data into the same
// calendar days the user sees (produced_at is a timestamptz).
function browserTz(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

// Fetch contiguous data clusters for a vehicle. When `date` (YYYY-MM-DD) is
// given, the backend scopes the scan to that single local day, which is the
// main lever for keeping the raw-data query fast.
export async function fetchClusters(
  vehicleId: string,
  date?: string,
  gap = 30,
): Promise<DataCluster[]> {
  const params = new URLSearchParams({ vehicle_id: vehicleId, gap: String(gap) });
  if (date) {
    params.append("date", date);
    params.append("tz", browserTz());
  }
  const res = await axios.get(`${BACKEND_URL}/query/clusters?${params}`, {
    headers: authHeaders(),
  });
  return res.data?.data?.data ?? [];
}

// Distinct calendar days (YYYY-MM-DD, ascending) that have data for a vehicle,
// in the browser's timezone. Backs the date selector's default day and the
// "days with data" hints in the calendar.
export async function fetchDataDates(vehicleId: string): Promise<string[]> {
  const params = new URLSearchParams({ vehicle_id: vehicleId, tz: browserTz() });
  const res = await axios.get(`${BACKEND_URL}/query/clusters/dates?${params}`, {
    headers: authHeaders(),
  });
  return res.data?.data?.data ?? [];
}

export async function fetchSignalNames(
  vehicleId: string,
  start?: string,
  end?: string,
): Promise<string[]> {
  const params = new URLSearchParams({ vehicle_id: vehicleId });
  if (start) params.append("start", stripZ(start));
  if (end) params.append("end", stripZ(end));
  const res = await axios.get(`${BACKEND_URL}/query/signals/names?${params}`, {
    headers: authHeaders(),
  });
  return res.data?.data?.data ?? [];
}

// Target number of samples per signal for the track map. The canvas can't show
// more than a few thousand distinct points, so we let the backend decimate the
// query down to this many per signal instead of transferring every raw sample.
const TRACK_MAX_POINTS = 5000;

// Fetch lat/lon pairs for a vehicle over a time window, merged onto a single
// timeline. Returns points sorted by timestamp. The query is decimated
// server-side (see `max_points`) to keep wide windows from timing out.
export async function fetchSignalData(
  vehicleId: string,
  latField: string,
  lonField: string,
  start: string,
  end: string,
): Promise<GeoPoint[]> {
  const params = new URLSearchParams();
  params.append("signals", `${latField},${lonField}`);
  params.append("vehicle_id", vehicleId);
  params.append("start", stripZ(start));
  params.append("end", stripZ(end));
  params.append("merge", "largest");
  params.append("fill", "forward");
  params.append("max_points", String(TRACK_MAX_POINTS));

  const res = await axios.get(`${BACKEND_URL}/query/signals/data?${params}`, {
    headers: authHeaders(),
  });
  const records: Record<string, unknown>[] = res.data?.data?.data ?? [];

  const points: GeoPoint[] = [];
  for (const rec of records) {
    const producedAt = rec["produced_at"];
    if (producedAt == null) continue;
    const lat = Number(rec[latField]);
    const lon = Number(rec[lonField]);
    // Drop non-numeric readings and the 0,0 "null island" fix the receiver
    // emits before it locks. Unlike the calibration time series (which already
    // skips these), the track autoscales to its bounding box, so a single bad
    // outlier collapses the real path and leaves stray lines shooting to it.
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (lat === 0 && lon === 0) continue;
    points.push({
      lat,
      lon,
      ts: new Date(String(producedAt)).getTime() / 1000,
    });
  }
  points.sort((a, b) => a.ts - b.ts);
  return points;
}

// Fetch an arbitrary set of signals over a time window, merged onto a single
// timeline, for the calibration (signals-vs-time) view. Returns rows of
// { ts, <signal>: value, ... } sorted by timestamp. Like fetchSignalData, the
// query is decimated server-side (max_points) so wide windows stay fast.
export async function fetchSignalSeries(
  vehicleId: string,
  signals: string[],
  start: string,
  end: string,
): Promise<SignalSample[]> {
  if (signals.length === 0) return [];
  const params = new URLSearchParams();
  params.append("signals", signals.join(","));
  params.append("vehicle_id", vehicleId);
  params.append("start", stripZ(start));
  params.append("end", stripZ(end));
  params.append("merge", "largest");
  params.append("fill", "forward");
  params.append("max_points", String(TRACK_MAX_POINTS));

  const res = await axios.get(`${BACKEND_URL}/query/signals/data?${params}`, {
    headers: authHeaders(),
  });
  const records: Record<string, unknown>[] = res.data?.data?.data ?? [];

  const samples: SignalSample[] = [];
  for (const rec of records) {
    const producedAt = rec["produced_at"];
    if (producedAt == null) continue;
    const sample: SignalSample = {
      ts: new Date(String(producedAt)).getTime() / 1000,
    };
    for (const sig of signals) {
      const v = rec[sig];
      if (v != null) sample[sig] = Number(v);
    }
    samples.push(sample);
  }
  samples.sort((a, b) => a.ts - b.ts);
  return samples;
}

export async function fetchSessions(
  vehicleId: string,
  opts?: { limit?: number; offset?: number },
): Promise<Session[]> {
  const params = new URLSearchParams({ vehicle_id: vehicleId });
  if (opts?.limit != null) {
    params.append("limit", String(opts.limit));
    params.append("offset", String(opts.offset ?? 0));
  }
  const res = await axios.get(`${BACKEND_URL}/sessions?${params}`, {
    headers: authHeaders(),
  });
  return res.data?.data ?? [];
}

// Persist analysis onto a session (upsert via POST /sessions/:id).
export async function saveSessionAnalysis(
  session: Session,
  analysis: AnalysisPayload,
): Promise<Session> {
  const body = {
    id: session.id,
    vehicle_id: session.vehicle_id,
    name: session.name,
    description: session.description,
    start_time: session.start_time,
    end_time: session.end_time,
    analysis,
  };
  const res = await axios.post(
    `${BACKEND_URL}/sessions/${session.id}`,
    body,
    { headers: authHeaders() },
  );
  return res.data?.data ?? session;
}

// Create a new named session covering a time window (for sessioning raw data).
export async function createSession(session: {
  id: string;
  vehicle_id: string;
  name: string;
  description: string;
  start_time: string;
  end_time: string;
}): Promise<Session> {
  const res = await axios.post(
    `${BACKEND_URL}/sessions/${session.id}`,
    session,
    { headers: authHeaders() },
  );
  return res.data?.data ?? (session as Session);
}

// A lap (with its sectors) ready to persist — the client-detected shape sent
// to the backend, which assigns ids/timestamps and returns the stored Laps.
export interface LapInput {
  lap_number: number;
  start_time: string;
  end_time: string;
  duration_ms: number;
  is_best: boolean;
  sectors: { sector_number: number; duration_ms: number }[];
}

// Fetch the persisted laps for a session.
export async function fetchSessionLaps(sessionId: string): Promise<Lap[]> {
  const res = await axios.get(
    `${BACKEND_URL}/sessions/${sessionId}/laps`,
    { headers: authHeaders() },
  );
  return res.data?.data ?? [];
}

// Replace the persisted laps for a session (PUT). Returns the stored Laps.
export async function saveSessionLaps(
  sessionId: string,
  laps: LapInput[],
): Promise<Lap[]> {
  const res = await axios.put(
    `${BACKEND_URL}/sessions/${sessionId}/laps`,
    { laps },
    { headers: authHeaders() },
  );
  return res.data?.data ?? [];
}

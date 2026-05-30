// HTTP client for Lapache. Replaces the desktop app's direct DB access with the
// Mapache gateway APIs. The gateway wraps each service response once under a
// `data` key, so Go endpoints (bare body) read as response.data.data and the
// Python query endpoints ({data: ...}) read as response.data.data.data.

import axios from "axios";
import { BACKEND_URL } from "@/consts/config";
import { AnalysisPayload, DataCluster, GeoPoint, Session } from "@/models/lapache";

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

// Fetch lat/lon pairs for a vehicle over a time window, merged onto a single
// timeline. Returns points sorted by timestamp.
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

  const res = await axios.get(`${BACKEND_URL}/query/signals?${params}`, {
    headers: authHeaders(),
  });
  const records: Record<string, unknown>[] = res.data?.data?.data ?? [];

  const points: GeoPoint[] = [];
  for (const rec of records) {
    const lat = rec[latField];
    const lon = rec[lonField];
    const producedAt = rec["produced_at"];
    if (lat == null || lon == null || producedAt == null) continue;
    points.push({
      lat: Number(lat),
      lon: Number(lon),
      ts: new Date(String(producedAt)).getTime() / 1000,
    });
  }
  points.sort((a, b) => a.ts - b.ts);
  return points;
}

export async function fetchSessions(vehicleId: string): Promise<Session[]> {
  const params = new URLSearchParams({ vehicle_id: vehicleId });
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

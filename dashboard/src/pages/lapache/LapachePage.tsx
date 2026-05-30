import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import { getAxiosErrorMessage } from "@/lib/axios-error-handler";
import { useVehicle } from "@/lib/store";
import {
  AnalysisPayload,
  DataCluster,
  GeoPoint,
  LapResult,
  NormMode,
  Point,
  Session,
  hasAnalysis,
} from "@/models/lapache";
import { SegmentManager } from "@/lib/lapache/segments";
import { normalizeCoordinates } from "@/lib/lapache/geo";
import { processLaps } from "@/lib/lapache/lapEngine";
import { Vec2 } from "@/lib/lapache/intersect";
import {
  createSession,
  fetchClusters,
  fetchDataDates,
  fetchSessions,
  fetchSignalData,
  fetchSignalNames,
  saveSessionAnalysis,
} from "@/lib/lapache/api";
import TrackCanvas from "./components/TrackCanvas";
import SignalPicker from "./components/SignalPicker";
import TimelineCrop from "./components/TimelineCrop";
import ResultsPanel from "./components/ResultsPanel";
import SessionSidebar, { LoadTarget } from "./components/SessionSidebar";
import DateSelector, { dayKey } from "./components/DateSelector";

function LapachePage() {
  const vehicle = useVehicle();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [clusters, setClusters] = useState<DataCluster[]>([]);
  const [loadingClusters, setLoadingClusters] = useState(false);

  // Day currently in view. The date selector limits what we query: clusters are
  // fetched one day at a time, and sessions are filtered to their start day.
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [windowStart, setWindowStart] = useState<string | null>(null);
  const [windowEnd, setWindowEnd] = useState<string | null>(null);

  const [signalNames, setSignalNames] = useState<string[]>([]);
  const [latField, setLatField] = useState("");
  const [lonField, setLonField] = useState("");
  const [normMode, setNormMode] = useState<NormMode>(NormMode.WGS84);

  const [rawGeo, setRawGeo] = useState<GeoPoint[]>([]);
  const [allPoints, setAllPoints] = useState<Point[]>([]);
  const [extentStartTs, setExtentStartTs] = useState(0);
  const [extentEndTs, setExtentEndTs] = useState(0);
  const [cropStartTs, setCropStartTs] = useState(0);
  const [cropEndTs, setCropEndTs] = useState(0);
  const savedCropRef = useRef<[number, number] | null>(null);

  const segMgrRef = useRef(new SegmentManager());
  const [segVersion, setSegVersion] = useState(0);
  const [activeSeg, setActiveSeg] = useState(1);
  const bumpSeg = () => setSegVersion((v) => v + 1);

  const [lapResult, setLapResult] = useState<LapResult | null>(null);
  const [status, setStatus] = useState("Select a session or data cluster.");
  const [newSessionName, setNewSessionName] = useState("");

  // -- Per-vehicle: load sessions + available days, default to latest day -----
  useEffect(() => {
    if (!vehicle.id) return;
    setSelectedLabel(null);
    setSelectedSession(null);
    setAllPoints([]);
    setRawGeo([]);
    setLapResult(null);
    setClusters([]);
    loadSessions();
    (async () => {
      const dates = await fetchDataDates(vehicle.id).catch(() => []);
      setAvailableDates(dates);
      // Default to the most recent day with data (dates are ascending).
      if (dates.length > 0) {
        const [y, m, d] = dates[dates.length - 1].split("-").map(Number);
        setSelectedDate(new Date(y, m - 1, d));
      } else {
        setSelectedDate(new Date());
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle.id]);

  // -- Clusters for the selected day -----------------------------------------
  useEffect(() => {
    if (!vehicle.id) return;
    let cancelled = false;
    setLoadingClusters(true);
    (async () => {
      try {
        const c = await fetchClusters(vehicle.id, dayKey(selectedDate));
        if (!cancelled) setClusters(c);
      } catch (e) {
        if (!cancelled) notify.error(getAxiosErrorMessage(e));
      } finally {
        if (!cancelled) setLoadingClusters(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle.id, selectedDate]);

  const loadSessions = async () => {
    try {
      const s = await fetchSessions(vehicle.id).catch(() => []);
      setSessions(s);
    } catch (e) {
      notify.error(getAxiosErrorMessage(e));
    }
  };

  // -- Selection -------------------------------------------------------------
  const handleSelect = useCallback(async (target: LoadTarget) => {
    setSelectedLabel(target.label);
    setSelectedSession(target.session);
    setWindowStart(target.startTime);
    setWindowEnd(target.endTime);
    setAllPoints([]);
    setRawGeo([]);
    setLapResult(null);
    segMgrRef.current = new SegmentManager();
    setActiveSeg(1);

    const analysis = target.session?.analysis;
    if (hasAnalysis(analysis)) {
      setLatField(analysis.lat_field || "");
      setLonField(analysis.lon_field || "");
      setNormMode((analysis.norm_mode as NormMode) || NormMode.WGS84);
      segMgrRef.current.loadFromPayload(analysis.segments || {});
      savedCropRef.current =
        analysis.crop_start_ts && analysis.crop_end_ts
          ? [analysis.crop_start_ts, analysis.crop_end_ts]
          : null;
    } else {
      setLatField("");
      setLonField("");
      savedCropRef.current = null;
    }
    bumpSeg();

    setStatus(`Loading signals for ${target.label}…`);
    try {
      const names = await fetchSignalNames(
        vehicle.id,
        target.startTime,
        target.endTime,
      );
      setSignalNames(names);
      setStatus(`${names.length} signals available`);
    } catch (e) {
      setStatus("Failed to fetch signal names");
      notify.error(getAxiosErrorMessage(e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle.id]);

  // -- Fetch raw lat/lon when fields + window are set ------------------------
  useEffect(() => {
    if (!latField || !lonField || !windowStart || !windowEnd) return;
    let cancelled = false;
    (async () => {
      setStatus(`Fetching ${latField}, ${lonField}…`);
      try {
        const geo = await fetchSignalData(
          vehicle.id,
          latField,
          lonField,
          windowStart,
          windowEnd,
        );
        if (!cancelled) {
          setRawGeo(geo);
          setStatus(`${geo.length} points loaded`);
        }
      } catch (e) {
        if (!cancelled) {
          setStatus("Failed to fetch telemetry data");
          notify.error(getAxiosErrorMessage(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latField, lonField, windowStart, windowEnd, vehicle.id]);

  // -- Normalize whenever raw data or norm mode changes ----------------------
  useEffect(() => {
    if (rawGeo.length === 0) {
      setAllPoints([]);
      return;
    }
    const pts = normalizeCoordinates(rawGeo, normMode);
    setAllPoints(pts);

    const tsMin = pts[0].ts;
    const tsMax = pts[pts.length - 1].ts;
    setExtentStartTs(tsMin);
    setExtentEndTs(tsMax);

    const saved = savedCropRef.current;
    if (saved && saved[1] > tsMin && saved[0] < tsMax) {
      setCropStartTs(saved[0]);
      setCropEndTs(saved[1]);
    } else {
      setCropStartTs(tsMin);
      setCropEndTs(tsMax);
    }
  }, [rawGeo, normMode]);

  // -- Derived: cropped points -----------------------------------------------
  const croppedPoints = useMemo(
    () => allPoints.filter((p) => p.ts >= cropStartTs && p.ts <= cropEndTs),
    [allPoints, cropStartTs, cropEndTs],
  );

  // Threshold for point removal: a fraction of the data's diagonal extent.
  const removeThreshold = useMemo(() => {
    if (allPoints.length === 0) return 1;
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const p of allPoints) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    return Math.hypot(maxX - minX, maxY - minY) / 40;
  }, [allPoints]);

  const segmentsSnapshot = useMemo(() => {
    const m = segMgrRef.current.allSegments();
    const out: Record<number, Vec2[]> = {};
    for (let n = 1; n <= 9; n++) out[n] = (m[n] ?? []).map((p) => [p[0], p[1]]);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segVersion]);

  // -- Segment editing -------------------------------------------------------
  const onAddPoint = (world: Vec2) => {
    segMgrRef.current.setActive(activeSeg);
    segMgrRef.current.addPoint(world);
    bumpSeg();
  };
  const onRemovePoint = (world: Vec2) => {
    segMgrRef.current.removeNearest(world, removeThreshold);
    bumpSeg();
  };

  const handleProcess = useCallback(() => {
    if (!segMgrRef.current.hasStartFinish()) {
      setStatus("Place a 2-point S/F line first.");
      return;
    }
    if (croppedPoints.length === 0) {
      setStatus("No data loaded.");
      return;
    }
    const result = processLaps(croppedPoints, segMgrRef.current);
    setLapResult(result);
    setStatus(
      result.lapCount > 0
        ? `${result.lapCount} laps — best ${result.bestTime.toFixed(3)}s`
        : "No laps detected — check S/F placement.",
    );
  }, [croppedPoints]);

  // -- Keyboard shortcuts ----------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.ctrlKey && e.key.toLowerCase() === "z") {
        if (e.shiftKey) segMgrRef.current.redo();
        else segMgrRef.current.undo();
        bumpSeg();
        return;
      }
      if (!e.ctrlKey && e.key >= "1" && e.key <= "9") {
        setActiveSeg(Number(e.key));
        return;
      }
      if (e.key.toLowerCase() === "p") handleProcess();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleProcess]);

  // -- Save / create session / export ----------------------------------------
  const buildPayload = (): AnalysisPayload => ({
    lat_field: latField,
    lon_field: lonField,
    norm_mode: normMode,
    crop_start_ts: cropStartTs,
    crop_end_ts: cropEndTs,
    segments: segMgrRef.current.toPayload(),
    laps: (lapResult?.lapTimes ?? []).map((total, i) => ({
      lap: i + 1,
      total,
    })),
    summary: {
      count: lapResult?.lapCount ?? 0,
      best: lapResult?.bestTime ?? 0,
      avg: lapResult?.avgTime ?? 0,
      worst: lapResult?.worstTime ?? 0,
    },
  });

  const handleSave = async () => {
    if (!selectedSession) {
      setStatus("Create a session from this data before saving.");
      return;
    }
    try {
      const updated = await saveSessionAnalysis(selectedSession, buildPayload());
      setSelectedSession(updated);
      setStatus(`Saved analysis for ${updated.name}`);
      loadSessions();
    } catch (e) {
      notify.error(getAxiosErrorMessage(e));
    }
  };

  const handleCreateSession = async () => {
    if (!newSessionName || !windowStart || !windowEnd) return;
    const id = `ssn_${Date.now().toString(36)}`;
    try {
      const created = await createSession({
        id,
        vehicle_id: vehicle.id,
        name: newSessionName,
        description: "",
        start_time: windowStart,
        end_time: windowEnd,
      });
      setSelectedSession(created);
      setSelectedLabel(`ssn:${created.id}`);
      setNewSessionName("");
      setStatus(`Created session ${created.name}`);
      loadSessions();
    } catch (e) {
      notify.error(getAxiosErrorMessage(e));
    }
  };

  const handleExport = () => {
    if (croppedPoints.length === 0) return;
    const laps = lapResult?.lapNumbers ?? [];
    const sectors = lapResult?.sectorNumbers ?? [];
    const rows = [["timestamp", "x", "y", "lap", "sector"]];
    croppedPoints.forEach((p, i) => {
      rows.push([
        p.ts.toFixed(6),
        p.x.toFixed(9),
        p.y.toFixed(9),
        String(laps[i] ?? 0),
        String(sectors[i] ?? 0),
      ]);
    });
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedSession?.name || "lapache_export"}.csv`.replace(
      /\s+/g,
      "_",
    );
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout activeTab="lapache" headerTitle="Lapache">
      <div className="flex h-[calc(100vh-7rem)] gap-4">
        {/* Sessions / clusters sidebar */}
        <Card className="flex w-64 flex-shrink-0 flex-col gap-3 p-3">
          <DateSelector
            value={selectedDate}
            availableDates={availableDates}
            onChange={setSelectedDate}
          />
          <div className="min-h-0 flex-1">
            <SessionSidebar
              sessions={sessions}
              clusters={clusters}
              selectedLabel={selectedLabel}
              selectedDate={selectedDate}
              loading={loadingClusters}
              onSelect={handleSelect}
            />
          </div>
        </Card>

        {/* Track + timeline */}
        <div className="flex flex-1 flex-col gap-3">
          <Card className="flex-1 overflow-hidden p-0">
            <TrackCanvas
              points={croppedPoints}
              segments={segmentsSnapshot}
              activeSegment={activeSeg}
              lapNumbers={
                lapResult && lapResult.lapNumbers.length === croppedPoints.length
                  ? lapResult.lapNumbers
                  : undefined
              }
              onAddPoint={onAddPoint}
              onRemovePoint={onRemovePoint}
            />
          </Card>
          {allPoints.length > 0 && (
            <TimelineCrop
              extentStartTs={extentStartTs}
              extentEndTs={extentEndTs}
              cropStartTs={cropStartTs}
              cropEndTs={cropEndTs}
              onChange={(s, e) => {
                setCropStartTs(s);
                setCropEndTs(e);
              }}
            />
          )}
          <div className="text-xs text-neutral-400">{status}</div>
        </div>

        {/* Controls */}
        <Card className="w-80 flex-shrink-0 overflow-auto p-4">
          <div className="flex flex-col gap-4">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase text-neutral-500">
                Signals
              </div>
              <SignalPicker
                signalNames={signalNames}
                latField={latField}
                lonField={lonField}
                normMode={normMode}
                onChange={(n) => {
                  setLatField(n.latField);
                  setLonField(n.lonField);
                  setNormMode(n.normMode);
                }}
              />
            </div>

            <div>
              <div className="mb-1 text-xs text-neutral-400">
                Active segment:{" "}
                <span className="font-mono text-white">
                  {segMgrRef.current.activeName ?? "S/F"}
                </span>{" "}
                (keys 1-9)
              </div>
              <div className="text-xs text-neutral-500">
                Click to place points · Shift/right-click to remove · P to
                process
              </div>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => {
                  segMgrRef.current.clear();
                  bumpSeg();
                }}
              >
                Clear segments
              </Button>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold uppercase text-neutral-500">
                Results
              </div>
              <ResultsPanel
                result={lapResult}
                canSave={!!selectedSession}
                onProcess={handleProcess}
                onSave={handleSave}
                onExport={handleExport}
              />
            </div>

            {!selectedSession && windowStart && (
              <div>
                <div className="mb-1 text-xs font-semibold uppercase text-neutral-500">
                  New session from crop
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Session name"
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                  />
                  <Button
                    size="sm"
                    onClick={handleCreateSession}
                    disabled={!newSessionName}
                  >
                    Create
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
}

export default LapachePage;

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
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
  LapacheMode,
  LapResult,
  NormMode,
  Point,
  Session,
  SignalSample,
  hasAnalysis,
} from "@/models/session";
import { SegmentManager } from "@/lib/sessions/segments";
import { normalizeCoordinates } from "@/lib/sessions/geo";
import {
  DEFAULT_OUTLIER_CONFIG,
  OutlierConfig,
  detectOutliers,
} from "@/lib/sessions/outliers";
import { processLaps } from "@/lib/sessions/lapEngine";
import { Vec2 } from "@/lib/sessions/intersect";
import {
  LapInput,
  createSession,
  fetchClusters,
  fetchDataDates,
  fetchSessions,
  fetchSignalData,
  fetchSignalNames,
  fetchSignalSeries,
  saveSessionAnalysis,
  saveSessionLaps,
} from "@/lib/sessions/api";
import { cn } from "@/lib/utils";
import TrackCanvas, { BaseMap } from "./editor/TrackCanvas";
import SignalPicker from "./editor/SignalPicker";
import OutlierControls from "./editor/OutlierControls";
import SignalTimeChart from "./editor/SignalTimeChart";
import CalibrationControls from "./editor/CalibrationControls";
import TimelineCrop from "./editor/TimelineCrop";
import ResultsPanel from "./editor/ResultsPanel";
import SessionSidebar, { LoadTarget } from "./editor/SessionSidebar";
import DateSelector, { dayKey } from "./editor/DateSelector";

// Convert a point's epoch-seconds timestamp into an ISO string for the API.
function tsToIso(tsSeconds: number): string {
  return new Date(tsSeconds * 1000).toISOString();
}

// First signal whose name matches `re` (e.g. /latitude/i), or "" if none. Used
// to autofill the lat/lon pickers when a session has no saved analysis.
function matchSignal(names: string[], re: RegExp): string {
  return names.find((n) => re.test(n)) ?? "";
}

// Derive the persisted lap shape from the lap-engine result. `crossingIndices`
// are the filtered S/F crossings, so lap k spans points[crossingIndices[k]] →
// points[crossingIndices[k+1]], and lapTimes[k] is that span's duration (s).
// Sector splits within a lap come from transitions in `sectorNumbers` between
// those two crossings; each sector's duration is the time between its boundary
// crossings (or the lap's start/end at the edges).
function deriveLapInputs(result: LapResult, points: Point[]): LapInput[] {
  const { crossingIndices, lapTimes, bestTime, sectorNumbers } = result;
  if (crossingIndices.length < 2) return [];

  const laps: LapInput[] = [];
  for (let k = 0; k < crossingIndices.length - 1; k++) {
    const startIdx = crossingIndices[k];
    const endIdx = crossingIndices[k + 1];
    const startTs = points[startIdx].ts;
    const endTs = points[endIdx].ts;
    const durationS = lapTimes[k] ?? endTs - startTs;

    // Sector boundaries inside this lap: indices where the sector number
    // changes. The lap opens with whatever sector is active at startIdx.
    const sectors: { sector_number: number; duration_ms: number }[] = [];
    let segStartIdx = startIdx;
    let segSector = sectorNumbers[startIdx] || 1;
    for (let i = startIdx + 1; i <= endIdx; i++) {
      const sec = sectorNumbers[i] || 0;
      if (sec !== segSector || i === endIdx) {
        const segEndIdx = i;
        const durMs = (points[segEndIdx].ts - points[segStartIdx].ts) * 1000;
        if (segSector > 0 && durMs > 0) {
          sectors.push({
            sector_number: segSector,
            duration_ms: Math.round(durMs),
          });
        }
        segStartIdx = segEndIdx;
        segSector = sec;
      }
    }

    laps.push({
      lap_number: k + 1,
      start_time: tsToIso(startTs),
      end_time: tsToIso(endTs),
      duration_ms: Math.round(durationS * 1000),
      is_best: durationS === bestTime,
      sectors,
    });
  }
  return laps;
}

export function SessionEditorPage() {
  const vehicle = useVehicle();
  const navigate = useNavigate();
  const { id: routeId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();

  // EDIT mode loads an existing session by id; CREATE mode (/sessions/new, no
  // :id param) starts from the cluster/date browser.
  const isEditMode = !!routeId && routeId !== "new";

  // A vehicle id can be pinned via ?vid=… (e.g. when arriving from a deep
  // link); otherwise fall back to the globally-selected vehicle.
  const vehicleId = searchParams.get("vid") || vehicle.id;

  // "lap" is the GPS track flow; "calibration" plots signals vs time for runs
  // without usable GPS and only trims a session window.
  const [mode, setMode] = useState<LapacheMode>("lap");

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
  const [normMode, setNormMode] = useState<NormMode>(NormMode.LocalCartesian);
  const [outlierCfg, setOutlierCfg] =
    useState<OutlierConfig>(DEFAULT_OUTLIER_CONFIG);

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
  const [status, setStatus] = useState(
    isEditMode ? "Loading session…" : "Select a data cluster to begin.",
  );
  const [newSessionName, setNewSessionName] = useState("");
  const [saving, setSaving] = useState(false);

  const [baseMap, setBaseMap] = useState<BaseMap>("satellite");

  // -- Calibration mode: signals-vs-time -------------------------------------
  const [calSignals, setCalSignals] = useState<string[]>([]);
  const [calSamples, setCalSamples] = useState<SignalSample[]>([]);
  const [calNormalized, setCalNormalized] = useState(false);

  const loadSessions = useCallback(async () => {
    if (!vehicleId) return [] as Session[];
    try {
      const s = await fetchSessions(vehicleId).catch(() => []);
      setSessions(s);
      return s;
    } catch (e) {
      notify.error(getAxiosErrorMessage(e));
      return [] as Session[];
    }
  }, [vehicleId]);

  // -- Selection (shared by the sidebar and the edit-mode bootstrap) ---------
  const handleSelect = useCallback(
    async (target: LoadTarget) => {
      setSelectedLabel(target.label);
      setSelectedSession(target.session);
      setWindowStart(target.startTime);
      setWindowEnd(target.endTime);
      setAllPoints([]);
      setRawGeo([]);
      setLapResult(null);
      setCalSamples([]);
      segMgrRef.current = new SegmentManager();
      setActiveSeg(1);

      const analysis = target.session?.analysis;
      const restoredFromAnalysis = hasAnalysis(analysis);
      if (restoredFromAnalysis) {
        setLatField(analysis.lat_field || "");
        setLonField(analysis.lon_field || "");
        setNormMode((analysis.norm_mode as NormMode) || NormMode.LocalCartesian);
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
          vehicleId,
          target.startTime,
          target.endTime,
        );
        setSignalNames(names);
        // No saved analysis: autofill the lat/lon pickers from the first
        // matching signal so the user need not reselect them every time.
        if (!restoredFromAnalysis) {
          setLatField(matchSignal(names, /latitude/i));
          setLonField(matchSignal(names, /longitude/i));
        }
        setStatus(`${names.length} signals available`);
      } catch (e) {
        setStatus("Failed to fetch signal names");
        notify.error(getAxiosErrorMessage(e));
      }
    },
    [vehicleId],
  );

  // -- Per-vehicle: load sessions + available days, default to latest day -----
  useEffect(() => {
    if (!vehicleId) return;
    setSelectedLabel(null);
    setSelectedSession(null);
    setAllPoints([]);
    setRawGeo([]);
    setLapResult(null);
    setClusters([]);
    setCalSamples([]);
    setCalSignals([]);

    (async () => {
      const loaded = await loadSessions();
      const dates = await fetchDataDates(vehicleId).catch(() => []);
      setAvailableDates(dates);

      // EDIT mode: find the routed session and load it directly.
      if (isEditMode) {
        const existing = loaded.find((s) => s.id === routeId);
        if (existing) {
          const [y, m, d] = (existing.start_time.split("T")[0] || "")
            .split("-")
            .map(Number);
          if (y && m && d) setSelectedDate(new Date(y, m - 1, d));
          await handleSelect({
            startTime: existing.start_time,
            endTime: existing.end_time,
            label: `ssn:${existing.id}`,
            session: existing,
          });
          return;
        }
        setStatus("Session not found.");
        return;
      }

      // CREATE mode: default to the most recent day with data (ascending list).
      if (dates.length > 0) {
        const [y, m, d] = dates[dates.length - 1].split("-").map(Number);
        setSelectedDate(new Date(y, m - 1, d));
      } else {
        setSelectedDate(new Date());
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId, routeId, isEditMode]);

  // -- Clusters for the selected day -----------------------------------------
  useEffect(() => {
    if (!vehicleId) return;
    let cancelled = false;
    setLoadingClusters(true);
    (async () => {
      try {
        const c = await fetchClusters(vehicleId, dayKey(selectedDate));
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
  }, [vehicleId, selectedDate]);

  // -- Fetch raw lat/lon when fields + window are set ------------------------
  useEffect(() => {
    if (!latField || !lonField || !windowStart || !windowEnd) return;
    let cancelled = false;
    (async () => {
      setStatus(`Fetching ${latField}, ${lonField}…`);
      try {
        const geo = await fetchSignalData(
          vehicleId,
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
  }, [latField, lonField, windowStart, windowEnd, vehicleId]);

  // -- Outlier detection: split raw GPS into inliers / excluded --------------
  // Runs before normalization so a far-off "bus noise" point can't collapse the
  // track. Recomputed reactively; not persisted.
  const outlierFlags = useMemo(
    () => detectOutliers(rawGeo, outlierCfg),
    [rawGeo, outlierCfg],
  );
  const inlierGeo = useMemo(
    () => rawGeo.filter((_, i) => !outlierFlags[i]),
    [rawGeo, outlierFlags],
  );
  const excludedGeo = useMemo(
    () => rawGeo.filter((_, i) => outlierFlags[i]),
    [rawGeo, outlierFlags],
  );

  // -- Normalize whenever raw data or norm mode changes ----------------------
  useEffect(() => {
    if (inlierGeo.length === 0) {
      setAllPoints([]);
      return;
    }
    const pts = normalizeCoordinates(inlierGeo, normMode);
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
  }, [inlierGeo, normMode]);

  // -- Calibration: fetch selected signals over the window -------------------
  useEffect(() => {
    if (mode !== "calibration") return;
    if (calSignals.length === 0 || !windowStart || !windowEnd) {
      setCalSamples([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setStatus(`Fetching ${calSignals.length} signal(s)…`);
      try {
        const samples = await fetchSignalSeries(
          vehicleId,
          calSignals,
          windowStart,
          windowEnd,
        );
        if (!cancelled) {
          setCalSamples(samples);
          setStatus(`${samples.length} samples loaded`);
        }
      } catch (e) {
        if (!cancelled) {
          setStatus("Failed to fetch signal data");
          notify.error(getAxiosErrorMessage(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, calSignals, windowStart, windowEnd, vehicleId]);

  // -- Calibration: drive timeline extent + default crop from the samples ----
  useEffect(() => {
    if (calSamples.length === 0) return;
    const tsMin = calSamples[0].ts;
    const tsMax = calSamples[calSamples.length - 1].ts;
    setExtentStartTs(tsMin);
    setExtentEndTs(tsMax);
    setCropStartTs(tsMin);
    setCropEndTs(tsMax);
  }, [calSamples]);

  // -- Derived: cropped points -----------------------------------------------
  const croppedPoints = useMemo(
    () => allPoints.filter((p) => p.ts >= cropStartTs && p.ts <= cropEndTs),
    [allPoints, cropStartTs, cropEndTs],
  );

  // Lat/lon bbox of the cropped window, matching croppedPoints geographically.
  const croppedGeoBounds = useMemo(() => {
    let minLat = Infinity,
      maxLat = -Infinity,
      minLon = Infinity,
      maxLon = -Infinity;
    for (const p of inlierGeo) {
      if (p.ts < cropStartTs || p.ts > cropEndTs) continue;
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lon < minLon) minLon = p.lon;
      if (p.lon > maxLon) maxLon = p.lon;
    }
    if (!isFinite(minLat)) return null;
    return { minLat, maxLat, minLon, maxLon };
  }, [inlierGeo, cropStartTs, cropEndTs]);

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

  // -- Build the analysis blob persisted on the session ----------------------
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

  // Persist geometry/analysis + the derived laps, then route to the analysis
  // page for the session. Works for both edit and freshly-created sessions.
  const persistAndNavigate = async (session: Session) => {
    setSaving(true);
    try {
      const updated = await saveSessionAnalysis(session, buildPayload());
      if (lapResult && lapResult.lapCount > 0) {
        const laps = deriveLapInputs(lapResult, croppedPoints);
        await saveSessionLaps(updated.id, laps);
      }
      notify.success(`Saved analysis for ${updated.name}`);
      navigate(`/sessions/${updated.id}`);
    } catch (e) {
      notify.error(getAxiosErrorMessage(e));
      setSaving(false);
    }
  };

  // EDIT mode save: re-analyze the existing session.
  const handleSave = async () => {
    if (!selectedSession) {
      setStatus("Create a session from this data before saving.");
      return;
    }
    await persistAndNavigate(selectedSession);
  };

  // CREATE mode: create the session over the cluster window, then persist the
  // analysis + laps and navigate to its analysis page.
  const handleCreateSession = async () => {
    if (!newSessionName || !windowStart || !windowEnd) return;
    const id = `ssn_${Date.now().toString(36)}`;
    setSaving(true);
    try {
      const created = await createSession({
        id,
        vehicle_id: vehicleId,
        name: newSessionName,
        description: "",
        start_time: windowStart,
        end_time: windowEnd,
      });
      setSelectedSession(created);
      setSelectedLabel(`ssn:${created.id}`);
      setNewSessionName("");
      await persistAndNavigate(created);
    } catch (e) {
      notify.error(getAxiosErrorMessage(e));
      setSaving(false);
    }
  };

  // Calibration mode: create a plain session over the trimmed crop window (no
  // lap analysis), then route to its analysis page.
  const handleCreateSessionFromCrop = async (name: string) => {
    if (!name || !cropStartTs || !cropEndTs) return;
    const id = `ssn_${Date.now().toString(36)}`;
    setSaving(true);
    try {
      const created = await createSession({
        id,
        vehicle_id: vehicleId,
        name,
        description: "",
        start_time: tsToIso(cropStartTs),
        end_time: tsToIso(cropEndTs),
      });
      notify.success(`Created session ${created.name}`);
      navigate(`/sessions/${created.id}`);
    } catch (e) {
      notify.error(getAxiosErrorMessage(e));
      setSaving(false);
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
    a.download = `${selectedSession?.name || "session_export"}.csv`.replace(
      /\s+/g,
      "_",
    );
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout activeTab="sessions" headerTitle="Session Editor">
      <div className="flex h-[calc(100vh-7rem)] gap-4">
        {/* Sessions / clusters sidebar */}
        <Card className="flex w-64 flex-shrink-0 flex-col gap-3 p-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 justify-start gap-2 px-2 text-xs text-neutral-300"
            onClick={() =>
              navigate(
                vehicleId ? `/sessions?vid=${vehicleId}` : "/sessions",
              )
            }
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sessions
          </Button>
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

        {/* Track / chart + timeline */}
        <div className="flex flex-1 flex-col gap-3">
          {/* Mode toggle */}
          <div className="flex gap-1 self-start rounded-md border border-neutral-800 p-1">
            {(["lap", "calibration"] as LapacheMode[]).map((m) => (
              <Button
                key={m}
                size="sm"
                variant="ghost"
                className={cn(
                  "h-7 text-xs capitalize",
                  mode === m &&
                    "bg-gradient-to-br from-gr-pink to-gr-purple text-white",
                )}
                onClick={() => {
                  if (m === mode) return;
                  setMode(m);
                  setLapResult(null);
                  if (m === "lap") setCalSamples([]);
                }}
              >
                {m === "lap" ? "Lap (GPS)" : "Others"}
              </Button>
            ))}
          </div>

          <Card className="flex-1 overflow-hidden p-0">
            {mode === "lap" ? (
              <TrackCanvas
                points={croppedPoints}
                segments={segmentsSnapshot}
                activeSegment={activeSeg}
                baseMap={baseMap}
                geoBounds={croppedGeoBounds}
                lapNumbers={
                  lapResult &&
                  lapResult.lapNumbers.length === croppedPoints.length
                    ? lapResult.lapNumbers
                    : undefined
                }
                onAddPoint={onAddPoint}
                onRemovePoint={onRemovePoint}
              />
            ) : (
              <SignalTimeChart
                samples={calSamples}
                signals={calSignals}
                cropStartTs={cropStartTs}
                cropEndTs={cropEndTs}
                normalized={calNormalized}
              />
            )}
          </Card>
          {(mode === "lap" ? allPoints.length > 0 : calSamples.length > 0) && (
            <TimelineCrop
              extentStartTs={extentStartTs}
              extentEndTs={extentEndTs}
              cropStartTs={cropStartTs}
              cropEndTs={cropEndTs}
              onChange={(s, e) => {
                setCropStartTs(s);
                setCropEndTs(e);
              }}
              markers={mode === "lap" ? excludedGeo.map((p) => p.ts) : undefined}
            />
          )}
          <div className="text-xs text-neutral-400">{status}</div>
        </div>

        {/* Controls */}
        <Card className="w-80 flex-shrink-0 overflow-auto p-4">
          {mode === "calibration" ? (
            <CalibrationControls
              signalNames={signalNames}
              selected={calSignals}
              onToggleSignal={(id) =>
                setCalSignals((prev) =>
                  prev.includes(id)
                    ? prev.filter((s) => s !== id)
                    : [...prev, id],
                )
              }
              normalized={calNormalized}
              onNormalizedChange={setCalNormalized}
              cropLabel={
                calSamples.length > 0
                  ? `${new Date(cropStartTs * 1000).toLocaleTimeString()} – ${new Date(
                      cropEndTs * 1000,
                    ).toLocaleTimeString()}`
                  : "Load signals to set a window."
              }
              canCreate={calSamples.length > 0 && !saving}
              onCreateSession={handleCreateSessionFromCrop}
            />
          ) : (
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
                <div className="mt-4">
                  <OutlierControls
                    config={outlierCfg}
                    onChange={setOutlierCfg}
                    excluded={excludedGeo}
                  />
                </div>
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

              <div className="flex items-center justify-between">
                <div className="text-xs text-neutral-400">Base map</div>
                <div className="flex gap-1">
                  {(
                    [
                      ["satellite", "Satellite"],
                      ["streets", "Streets"],
                      ["none", "None"],
                    ] as [BaseMap, string][]
                  ).map(([mode, label]) => (
                    <Button
                      key={mode}
                      size="sm"
                      variant="ghost"
                      className={cn(
                        "h-7 text-xs",
                        baseMap === mode
                          ? "bg-gradient-to-br from-gr-pink to-gr-purple text-white"
                          : "text-neutral-400",
                      )}
                      onClick={() => setBaseMap(mode)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold uppercase text-neutral-500">
                  Results
                </div>
                <ResultsPanel
                  result={lapResult}
                  canSave={!!selectedSession && !saving}
                  onProcess={handleProcess}
                  onSave={handleSave}
                  onExport={handleExport}
                />
              </div>

              {!selectedSession && windowStart && (
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase text-neutral-500">
                    Save as new session
                  </div>
                  <div className="mb-2 text-xs text-neutral-500">
                    Names the cluster window, persists the analysis + laps, and
                    opens the session.
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
                      disabled={
                        !newSessionName ||
                        saving ||
                        !lapResult ||
                        lapResult.lapCount === 0
                      }
                    >
                      Create
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}

export default SessionEditorPage;

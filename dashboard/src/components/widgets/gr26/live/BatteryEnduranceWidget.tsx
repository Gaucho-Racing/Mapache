import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { ReadyState } from "react-use-websocket";
import {
  BatteryWarning,
  Play,
  Plus,
  Thermometer,
  Trash2,
  Undo2,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  useLiveSignals,
  type LiveSignalState,
  type SeriesPoint,
} from "@/lib/useLiveSignals";
import { fetchPairs, type PairRow } from "@/lib/pairs";
import {
  crossX,
  enduranceKey,
  formatElapsed,
  initEnduranceState,
  linearRegression,
  loadEndurance,
  meanPerLapDelta,
  projectLapsUntil,
  saveEndurance,
  summarize,
  type EnduranceState,
  type LapRow,
  type Regression,
  type Thresholds,
} from "@/lib/batteryEndurance";

const SOC_SIGNAL = "bcu_accumulator_soc";
const MINV_SIGNAL = "bcu_min_cell_voltage";
const MAXT_SIGNAL = "bcu_max_cell_temp";
const SIGNALS_CSV = `${SOC_SIGNAL},${MINV_SIGNAL},${MAXT_SIGNAL}`;

const ENDURANCE_MIN = 35; // fixed graph window: 0–35 minutes from event start
const STALE_MS = 5_000; // live sample older than this ⇒ flag the snapshot
const PAIRS_REFRESH_MS = 20_000;

const VOLTAGE_COLOR = "#3b82f6";
const TEMP_COLOR = "#ef4444";
const PROJECTION_OPACITY = 0.8;

interface BatteryEnduranceWidgetProps {
  vehicle_id: string;
  showDeltaBanner?: boolean;
}

// Runs the live subscription into caller-owned refs and renders nothing, so
// signal-rate churn never re-renders the table/chart. Memo'd on its inputs.
const LiveSignalsRunner = memo(function LiveSignalsRunner({
  vehicleId,
  latestRef,
  seriesRef,
  totalRef,
  backfillRef,
  onReadyChange,
}: {
  vehicleId: string;
  latestRef: MutableRefObject<Map<string, LiveSignalState>>;
  seriesRef: MutableRefObject<Map<string, SeriesPoint[]>>;
  totalRef: MutableRefObject<number>;
  backfillRef: MutableRefObject<number>;
  onReadyChange: (state: ReadyState) => void;
}) {
  useLiveSignals({
    vehicleId,
    transport: "ws",
    signals: SIGNALS_CSV,
    backfillSec: 30,
    rateHz: 5,
    seriesWindowMs: 60_000,
    latestRef,
    seriesRef,
    totalRef,
    backfillRef,
    onReadyChange,
  });
  return null;
});

function fmt(value: number | null | undefined, decimals: number): string {
  return value == null || !Number.isFinite(value)
    ? "—"
    : value.toFixed(decimals);
}

// Per-lap delta cell: shows absolute change and % change, colored by whether
// the move is toward the danger boundary (red) or away from it (green).
function DeltaCell({
  abs,
  pct,
  decimals,
  dangerOnRise,
}: {
  abs: number | null;
  pct: number | null;
  decimals: number;
  dangerOnRise: boolean;
}) {
  if (abs == null || !Number.isFinite(abs)) {
    return <span className="text-muted-foreground">—</span>;
  }
  const rising = abs > 0;
  const neutral = abs === 0;
  const danger = dangerOnRise ? rising : !rising;
  const color = neutral
    ? "text-muted-foreground"
    : danger
      ? "text-red-500"
      : "text-green-500";
  return (
    <span className={`font-mono tabular-nums ${color}`}>
      {rising ? "+" : ""}
      {abs.toFixed(decimals)}
      {pct != null && Number.isFinite(pct) && (
        <span className="ml-1 text-[10px] opacity-80">
          ({rising ? "+" : ""}
          {pct.toFixed(1)}%)
        </span>
      )}
    </span>
  );
}

function StatBox({
  label,
  value,
  unit,
  hint,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-mono text-lg font-semibold tabular-nums">
        {value}
        {unit && (
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function ProjectionCard({
  icon,
  label,
  laps,
  rate,
}: {
  icon: React.ReactNode;
  label: string;
  laps: number | null;
  rate: string;
}) {
  const reached = laps === 0;
  const tone =
    laps == null
      ? "border-border"
      : reached || laps <= 2
        ? "border-red-500/60 bg-red-500/10"
        : laps <= 5
          ? "border-yellow-500/60 bg-yellow-500/10"
          : "border-green-500/50 bg-green-500/10";
  return (
    <div className={`rounded-md border px-3 py-2 ${tone}`}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="font-mono text-2xl font-bold tabular-nums">
        {laps == null ? "—" : reached ? "now" : `${laps.toFixed(1)}`}
        {laps != null && !reached && (
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            laps
          </span>
        )}
      </div>
      <div className="text-[10px] text-muted-foreground">{rate}</div>
    </div>
  );
}

// Endpoints for a dashed forward projection: from the regression value at the
// last sample to where it crosses the boundary, clamped to the graph window.
function projectionSegment(
  reg: Regression | null,
  lastX: number,
  boundaryY: number,
  xMax: number,
): [{ x: number; y: number }, { x: number; y: number }] | null {
  if (!reg) return null;
  const yAtLast = reg.slope * lastX + reg.intercept;
  const cross = crossX(reg, boundaryY);
  let endX = cross == null || !Number.isFinite(cross) ? xMax : cross;
  endX = Math.min(Math.max(endX, lastX), xMax);
  const yAtEnd = reg.slope * endX + reg.intercept;
  return [
    { x: lastX, y: yAtLast },
    { x: endX, y: yAtEnd },
  ];
}

export default function BatteryEnduranceWidget({
  vehicle_id,
}: BatteryEnduranceWidgetProps) {
  const latestRef = useRef<Map<string, LiveSignalState>>(new Map());
  const seriesRef = useRef<Map<string, SeriesPoint[]>>(new Map());
  const totalRef = useRef(0);
  const backfillRef = useRef(0);
  const [ready, setReady] = useState<ReadyState>(ReadyState.UNINSTANTIATED);
  const onReadyChange = useCallback((s: ReadyState) => setReady(s), []);

  const [state, setState] = useState<EnduranceState>(initEnduranceState);
  const [pairsRows, setPairsRows] = useState<PairRow[]>([]);
  const [confirmReset, setConfirmReset] = useState(false);

  // Load persisted state on mount / vehicle change. localStorage is the source
  // of truth so the table survives refresh and token expiry.
  useEffect(() => {
    setState(loadEndurance(vehicle_id));
  }, [vehicle_id]);

  // Sync across tabs editing the same vehicle's table.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === enduranceKey(vehicle_id)) {
        setState(loadEndurance(vehicle_id));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [vehicle_id]);

  // 1 Hz tick to surface live readouts + elapsed without per-signal re-renders.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1_000);
    return () => clearInterval(id);
  }, []);

  const persist = useCallback(
    (next: EnduranceState) => {
      setState(next);
      saveEndurance(vehicle_id, next);
    },
    [vehicle_id],
  );

  // Pull dense voltage+temp samples over the event window for the chart.
  useEffect(() => {
    if (state.eventStartMs == null) {
      setPairsRows([]);
      return;
    }
    const startMs = state.eventStartMs;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetchPairs({
          vehicleId: vehicle_id,
          signals: [MINV_SIGNAL, MAXT_SIGNAL],
          startIso: new Date(startMs).toISOString(),
          endIso: new Date(Date.now()).toISOString(),
          maxPoints: 2000,
        });
        if (!cancelled) setPairsRows(res.rows);
      } catch {
        // Keep last good samples; the persisted table stays visible regardless.
      }
    };
    load();
    const id = setInterval(load, PAIRS_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [vehicle_id, state.eventStartMs, state.laps.length]);

  const connected = ready === ReadyState.OPEN;
  const now = Date.now();

  const liveSoc = latestRef.current.get(SOC_SIGNAL);
  const liveV = latestRef.current.get(MINV_SIGNAL);
  const liveT = latestRef.current.get(MAXT_SIGNAL);

  const startEvent = () => {
    persist({ ...state, eventStartMs: Date.now() });
  };

  const addLap = () => {
    const t = Date.now();
    const soc = latestRef.current.get(SOC_SIGNAL);
    const v = latestRef.current.get(MINV_SIGNAL);
    const temp = latestRef.current.get(MAXT_SIGNAL);
    const present = soc && v && temp;
    const oldest = present
      ? Math.min(soc.producedAt, v.producedAt, temp.producedAt)
      : 0;
    const eventStartMs = state.eventStartMs ?? t; // auto-anchor on first lap
    const lap: LapRow = {
      lap: state.laps.length + 1,
      tMs: t,
      elapsedMs: t - eventStartMs,
      soc: soc?.value ?? NaN,
      minV: v?.value ?? NaN,
      maxT: temp?.value ?? NaN,
      stale: !present || t - oldest > STALE_MS,
    };
    persist({ ...state, eventStartMs, laps: [...state.laps, lap] });
  };

  const undoLap = () => {
    if (state.laps.length === 0) return;
    persist({ ...state, laps: state.laps.slice(0, -1) });
  };

  const deleteLap = (index: number) => {
    const laps = state.laps
      .filter((_, i) => i !== index)
      .map((l, i) => ({ ...l, lap: i + 1 }));
    persist({ ...state, laps });
  };

  const reset = () => {
    persist(initEnduranceState());
    setConfirmReset(false);
  };

  const setThreshold = (key: keyof Thresholds, raw: string) => {
    const value = parseFloat(raw);
    if (!Number.isFinite(value)) return;
    persist({ ...state, thresholds: { ...state.thresholds, [key]: value } });
  };

  const { thresholds, laps } = state;

  const socValues = useMemo(() => laps.map((l) => l.soc), [laps]);
  const vValues = useMemo(() => laps.map((l) => l.minV), [laps]);
  const tValues = useMemo(() => laps.map((l) => l.maxT), [laps]);

  const lapsUntilTemp = projectLapsUntil(tValues, thresholds.tempMaxC, "up");
  const lapsUntilLowSoc = projectLapsUntil(
    socValues,
    thresholds.socLowPct,
    "down",
  );
  const lapsUntilEmptySoc = projectLapsUntil(
    socValues,
    thresholds.socEmptyPct,
    "down",
  );

  const socRate = meanPerLapDelta(socValues);
  const tRate = meanPerLapDelta(tValues);

  const socStats = summarize(socValues);
  const vStats = summarize(vValues);
  const tStats = summarize(tValues);

  const avgLapMs = useMemo(() => {
    if (laps.length < 2) return null;
    const deltas: number[] = [];
    for (let i = 1; i < laps.length; i++) {
      deltas.push(laps[i].tMs - laps[i - 1].tMs);
    }
    return deltas.reduce((a, b) => a + b, 0) / deltas.length;
  }, [laps]);

  const elapsedMs =
    state.eventStartMs != null ? now - state.eventStartMs : null;

  // Chart data: minutes since event start, clipped to the 0–35 window.
  const chartData = useMemo(() => {
    if (state.eventStartMs == null) return [];
    const startMs = state.eventStartMs;
    return pairsRows
      .map((r) => {
        const raw = r.produced_at;
        const t =
          typeof raw === "string"
            ? new Date(raw).getTime()
            : typeof raw === "number"
              ? raw
              : NaN;
        const v = r[MINV_SIGNAL];
        const temp = r[MAXT_SIGNAL];
        return {
          minute: (t - startMs) / 60_000,
          voltage: typeof v === "number" && Number.isFinite(v) ? v : null,
          temp: typeof temp === "number" && Number.isFinite(temp) ? temp : null,
        };
      })
      .filter((d) => d.minute >= 0 && d.minute <= ENDURANCE_MIN);
  }, [pairsRows, state.eventStartMs]);

  const vReg = useMemo(
    () =>
      linearRegression(
        chartData
          .filter((d) => d.voltage != null)
          .map((d) => ({ x: d.minute, y: d.voltage as number })),
      ),
    [chartData],
  );
  const tReg = useMemo(
    () =>
      linearRegression(
        chartData
          .filter((d) => d.temp != null)
          .map((d) => ({ x: d.minute, y: d.temp as number })),
      ),
    [chartData],
  );

  const lastX = chartData.length ? chartData[chartData.length - 1].minute : 0;
  const vSeg = projectionSegment(
    vReg,
    lastX,
    thresholds.minCellVFloor,
    ENDURANCE_MIN,
  );
  const tProjection = projectionSegment(
    tReg,
    lastX,
    thresholds.tempMaxC,
    ENDURANCE_MIN,
  );

  const voltages = chartData
    .map((d) => d.voltage)
    .filter((v): v is number => v != null);
  const temps = chartData
    .map((d) => d.temp)
    .filter((v): v is number => v != null);

  const vDomain: [number, number] = voltages.length
    ? [
        Math.min(thresholds.minCellVFloor, ...voltages) - 0.1,
        Math.max(...voltages) + 0.1,
      ]
    : [thresholds.minCellVFloor - 0.5, thresholds.minCellVFloor + 1.5];
  const tDomain: [number, number] = temps.length
    ? [Math.min(...temps) - 2, Math.max(thresholds.tempMaxC + 5, ...temps) + 2]
    : [20, thresholds.tempMaxC + 5];

  const vAt35 = vReg ? vReg.slope * 35 + vReg.intercept : null;
  const tAt35 = tReg ? tReg.slope * 35 + tReg.intercept : null;
  const socTimeReg = useMemo(
    () =>
      linearRegression(
        laps.map((l) => ({ x: l.elapsedMs / 60_000, y: l.soc })),
      ),
    [laps],
  );
  const socAt35 = socTimeReg
    ? socTimeReg.slope * 35 + socTimeReg.intercept
    : null;

  const pct = (curr: number, prev: number): number | null =>
    Number.isFinite(curr) && Number.isFinite(prev) && prev !== 0
      ? ((curr - prev) / Math.abs(prev)) * 100
      : null;

  return (
    <Card className="flex flex-col gap-4 p-4">
      <LiveSignalsRunner
        vehicleId={vehicle_id}
        latestRef={latestRef}
        seriesRef={seriesRef}
        totalRef={totalRef}
        backfillRef={backfillRef}
        onReadyChange={onReadyChange}
      />

      {/* Header: title, connection, live readout, controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pr-8">
        <div className="flex items-center gap-2">
          <BatteryWarning className="h-5 w-5 text-gr-pink" />
          <h1 className="text-xl font-bold">Battery Endurance Tracker</h1>
          <Badge
            variant={connected ? "secondary" : "outline"}
            className="gap-1"
          >
            {connected ? (
              <Wifi className="h-3 w-3 text-green-500" />
            ) : (
              <WifiOff className="h-3 w-3 text-muted-foreground" />
            )}
            {connected ? "Live" : "Offline"}
          </Badge>
          {elapsedMs != null && (
            <span className="font-mono text-sm text-muted-foreground">
              {formatElapsed(elapsedMs)} / {ENDURANCE_MIN}:00
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {state.eventStartMs == null && (
            <Button size="sm" onClick={startEvent}>
              <Play className="mr-1.5 h-4 w-4" />
              Start Event
            </Button>
          )}
          <Button size="sm" onClick={addLap}>
            <Plus className="mr-1.5 h-4 w-4" />
            Lap +1
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={undoLap}
            disabled={laps.length === 0}
          >
            <Undo2 className="mr-1.5 h-4 w-4" />
            Undo
          </Button>
          {confirmReset ? (
            <div className="flex items-center gap-1">
              <Button size="sm" variant="destructive" onClick={reset}>
                Confirm reset
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmReset(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirmReset(true)}
              disabled={laps.length === 0 && state.eventStartMs == null}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Live readout + projections */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatBox
          label="SOC"
          value={fmt(liveSoc?.value, 1)}
          unit="%"
          hint="live"
        />
        <StatBox
          label="Min cell V"
          value={fmt(liveV?.value, 3)}
          unit="V"
          hint="live"
        />
        <StatBox
          label="Max cell T"
          value={fmt(liveT?.value, 1)}
          unit="°C"
          hint="live"
        />
        <ProjectionCard
          icon={<Thermometer className="h-3 w-3" />}
          label={`to ${thresholds.tempMaxC}°C`}
          laps={lapsUntilTemp}
          rate={
            tRate == null
              ? "—"
              : `${tRate >= 0 ? "+" : ""}${tRate.toFixed(2)}°C/lap`
          }
        />
        <ProjectionCard
          icon={<BatteryWarning className="h-3 w-3" />}
          label={`to ${thresholds.socLowPct}% SOC`}
          laps={lapsUntilLowSoc}
          rate={socRate == null ? "—" : `${socRate.toFixed(2)}%/lap`}
        />
        <ProjectionCard
          icon={<Zap className="h-3 w-3" />}
          label={`to ${thresholds.socEmptyPct}% SOC`}
          laps={lapsUntilEmptySoc}
          rate={socRate == null ? "—" : `${socRate.toFixed(2)}%/lap`}
        />
      </div>

      {/* Graph */}
      <div className="rounded-md border p-3">
        {state.eventStartMs == null ? (
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            Press “Start Event” to begin plotting voltage &amp; temperature.
          </div>
        ) : (
          <div className="h-[300px] w-full">
            <ChartContainer
              className="!aspect-auto h-full w-full"
              config={{
                voltage: { color: VOLTAGE_COLOR, label: "Min cell V" },
                temp: { color: TEMP_COLOR, label: "Max cell °C" },
              }}
            >
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 16, left: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="minute"
                  type="number"
                  domain={[0, ENDURANCE_MIN]}
                  ticks={[0, 5, 10, 15, 20, 25, 30, 35]}
                  tickFormatter={(v) => `${v}m`}
                  height={24}
                />
                <YAxis
                  yAxisId="voltage"
                  orientation="left"
                  domain={vDomain}
                  width={48}
                  tickFormatter={(v) => v.toFixed(2)}
                  stroke={VOLTAGE_COLOR}
                />
                <YAxis
                  yAxisId="temp"
                  orientation="right"
                  domain={tDomain}
                  width={44}
                  tickFormatter={(v) => v.toFixed(0)}
                  stroke={TEMP_COLOR}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value: unknown) =>
                        typeof value === "number"
                          ? `${value.toFixed(1)} min`
                          : String(value)
                      }
                      formatter={(value, name) => {
                        const num =
                          typeof value === "number" ? value : Number(value);
                        const unit = name === "temp" ? "°C" : "V";
                        return [
                          `${num.toFixed(name === "temp" ? 1 : 3)} ${unit}`,
                          name === "temp" ? "Max cell T" : "Min cell V",
                        ];
                      }}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />

                <ReferenceLine
                  yAxisId="temp"
                  y={thresholds.tempMaxC}
                  stroke={TEMP_COLOR}
                  strokeDasharray="2 2"
                  label={{
                    value: `${thresholds.tempMaxC}°C`,
                    position: "insideTopRight",
                    style: { fontSize: 10, fill: TEMP_COLOR },
                  }}
                />
                <ReferenceLine
                  yAxisId="voltage"
                  y={thresholds.minCellVFloor}
                  stroke={VOLTAGE_COLOR}
                  strokeDasharray="2 2"
                  label={{
                    value: `${thresholds.minCellVFloor}V`,
                    position: "insideBottomLeft",
                    style: { fontSize: 10, fill: VOLTAGE_COLOR },
                  }}
                />
                <ReferenceLine
                  yAxisId="temp"
                  x={ENDURANCE_MIN}
                  stroke="currentColor"
                  strokeOpacity={0.4}
                  label={{
                    value: "finish",
                    position: "insideTopLeft",
                    style: { fontSize: 10 },
                  }}
                />

                {vSeg && (
                  <ReferenceLine
                    yAxisId="voltage"
                    segment={vSeg}
                    stroke={VOLTAGE_COLOR}
                    strokeOpacity={PROJECTION_OPACITY}
                    strokeDasharray="6 4"
                    ifOverflow="hidden"
                  />
                )}
                {tProjection && (
                  <ReferenceLine
                    yAxisId="temp"
                    segment={tProjection}
                    stroke={TEMP_COLOR}
                    strokeOpacity={PROJECTION_OPACITY}
                    strokeDasharray="6 4"
                    ifOverflow="hidden"
                  />
                )}

                <Line
                  yAxisId="voltage"
                  type="monotone"
                  dataKey="voltage"
                  name="voltage"
                  stroke={VOLTAGE_COLOR}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  connectNulls
                />
                <Line
                  yAxisId="temp"
                  type="monotone"
                  dataKey="temp"
                  name="temp"
                  stroke={TEMP_COLOR}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  connectNulls
                />
              </LineChart>
            </ChartContainer>
          </div>
        )}
      </div>

      {/* Statistics + thresholds */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        <StatBox
          label="Laps"
          value={String(laps.length)}
          hint={avgLapMs != null ? `avg ${formatElapsed(avgLapMs)}` : undefined}
        />
        <StatBox
          label="SOC min/avg"
          value={
            socStats ? `${fmt(socStats.min, 0)}/${fmt(socStats.avg, 0)}` : "—"
          }
          unit="%"
        />
        <StatBox
          label="V min/avg"
          value={vStats ? `${fmt(vStats.min, 2)}/${fmt(vStats.avg, 2)}` : "—"}
          unit="V"
        />
        <StatBox
          label="T max/avg"
          value={tStats ? `${fmt(tStats.max, 0)}/${fmt(tStats.avg, 0)}` : "—"}
          unit="°C"
        />
        <StatBox
          label="SOC @35m"
          value={fmt(socAt35, 0)}
          unit="%"
          hint="projected"
        />
        <StatBox
          label="V @35m"
          value={fmt(vAt35, 2)}
          unit="V"
          hint="projected"
        />
        <StatBox
          label="T @35m"
          value={fmt(tAt35, 0)}
          unit="°C"
          hint="projected"
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <ThresholdInput
          label="Temp max (°C)"
          value={thresholds.tempMaxC}
          step="1"
          onCommit={(v) => setThreshold("tempMaxC", v)}
        />
        <ThresholdInput
          label="SOC low (%)"
          value={thresholds.socLowPct}
          step="1"
          onCommit={(v) => setThreshold("socLowPct", v)}
        />
        <ThresholdInput
          label="Cell V floor"
          value={thresholds.minCellVFloor}
          step="0.05"
          onCommit={(v) => setThreshold("minCellVFloor", v)}
        />
      </div>

      {/* Lap table */}
      <div className="max-h-[320px] overflow-auto rounded-md border">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              <TableHead className="w-12">Lap</TableHead>
              <TableHead>Time</TableHead>
              <TableHead className="text-right">SOC %</TableHead>
              <TableHead className="text-right">ΔSOC</TableHead>
              <TableHead className="text-right">Min V</TableHead>
              <TableHead className="text-right">ΔV</TableHead>
              <TableHead className="text-right">Max °C</TableHead>
              <TableHead className="text-right">ΔT</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {laps.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="py-6 text-center text-muted-foreground"
                >
                  No laps yet — press “Lap +1” to capture the current values.
                </TableCell>
              </TableRow>
            ) : (
              laps.map((lap, i) => {
                const prev = i > 0 ? laps[i - 1] : null;
                const dSoc = prev ? lap.soc - prev.soc : null;
                const dV = prev ? lap.minV - prev.minV : null;
                const dT = prev ? lap.maxT - prev.maxT : null;
                return (
                  <TableRow
                    key={lap.tMs}
                    className={i === laps.length - 1 ? "bg-muted/40" : ""}
                  >
                    <TableCell className="font-mono font-semibold">
                      {lap.lap}
                      {lap.stale && (
                        <span
                          className="ml-1 text-yellow-500"
                          title="Live data was stale when captured"
                        >
                          *
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {formatElapsed(lap.elapsedMs)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {fmt(lap.soc, 1)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DeltaCell
                        abs={dSoc}
                        pct={prev ? pct(lap.soc, prev.soc) : null}
                        decimals={1}
                        dangerOnRise={false}
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {fmt(lap.minV, 3)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DeltaCell
                        abs={dV}
                        pct={prev ? pct(lap.minV, prev.minV) : null}
                        decimals={3}
                        dangerOnRise={false}
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {fmt(lap.maxT, 1)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DeltaCell
                        abs={dT}
                        pct={prev ? pct(lap.maxT, prev.maxT) : null}
                        decimals={1}
                        dangerOnRise={true}
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => deleteLap(i)}
                        className="text-muted-foreground transition-colors hover:text-destructive"
                        title="Delete lap"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

// Local threshold field: edits a draft string, commits the parsed number on
// blur / Enter so typing intermediate values doesn't thrash persisted state.
function ThresholdInput({
  label,
  value,
  step,
  onCommit,
}: {
  label: string;
  value: number;
  step: string;
  onCommit: (raw: string) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => {
    setDraft(String(value));
  }, [value]);
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      <Input
        type="number"
        step={step}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onCommit(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="h-8 w-28"
      />
    </label>
  );
}

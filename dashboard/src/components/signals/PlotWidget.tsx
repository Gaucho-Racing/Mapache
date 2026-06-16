import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { SignalTree } from "@/components/signals/SignalTree";
import { PlotChart, type PlotConfig, type PlotKind } from "./PlotChart";
import { QueryBuilder } from "@/components/signals/QueryBuilder";
import type { Series } from "@/components/signals/QueryChart";
import { fetchPairs, pairsToSeries, type PairsResponse } from "@/lib/pairs";
import { BACKEND_URL } from "@/consts/config";
import { getAxiosErrorMessage } from "@/lib/axios-error-handler";
import { notify } from "@/lib/notify";
import {
  DEFAULT_QUERY,
  type Query,
  serializeQuery,
} from "@/lib/query";
// ExportDialog is owned by Workstream B — import it by its agreed path. If it
// isn't present yet, the orchestrator reconciles this (see note below).
// depends on Workstream B (dashboard/src/components/signals/ExportDialog.tsx)
import { ExportDialog } from "@/components/signals/ExportDialog";
import axios from "axios";
import type { ECharts } from "echarts/core";
import { Download, Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

function authHeader() {
  return {
    Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
  };
}

const KIND_OPTIONS: { value: PlotKind; label: string }[] = [
  { value: "scatter", label: "Scatter (X vs Y)" },
  { value: "path", label: "Path (X-Y track)" },
  { value: "scatter3d", label: "3D scatter" },
  { value: "bar", label: "Bar (aggregate)" },
  { value: "pie", label: "Pie (aggregate)" },
];

// Kinds that read /query/pairs (signal-vs-signal) vs /query/run (categorical).
const PAIR_KINDS: PlotKind[] = ["scatter", "path", "scatter3d"];

interface PlotWidgetProps {
  vehicleId: string;
  vehicleType: string;
  /** Signal names for the X/Y/Z pickers. */
  signalNames: string[];
  startIso: string;
  endIso: string;
  hidden: boolean;
  onToggleHide: () => void;
  onDelete: () => void;
}

export function PlotWidget({
  vehicleId,
  vehicleType,
  signalNames,
  startIso,
  endIso,
  hidden,
  onToggleHide,
  onDelete,
}: PlotWidgetProps) {
  const [kind, setKind] = useState<PlotKind>("scatter");
  const [xSignal, setXSignal] = useState<string | undefined>();
  const [ySignals, setYSignals] = useState<string[]>([]);
  const [zSignal, setZSignal] = useState<string | undefined>();
  const [colorBy, setColorBy] = useState<string>("none");
  // bar/pie reuse the query-language builder exactly like SignalWidget, then
  // turn each group-by series into one bar/slice.
  const [queryAst, setQueryAst] = useState<Query>(DEFAULT_QUERY);

  const [pairs, setPairs] = useState<PairsResponse>({
    columns: ["produced_at"],
    rows: [],
  });
  const [categorical, setCategorical] = useState<Series[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const isPairKind = PAIR_KINDS.includes(kind);
  const isCategorical = kind === "bar" || kind === "pie";

  const signalOptions = useMemo(
    () => signalNames.map((n) => ({ id: n })),
    [signalNames],
  );

  // The exact signals a pair fetch needs for this config — x, every y, z, and
  // any color-by signal. Deduped. Drives both the fetch and its enablement.
  const pairSignals = useMemo(() => {
    const set = new Set<string>();
    if (xSignal) set.add(xSignal);
    for (const y of ySignals) set.add(y);
    if (kind === "scatter3d" && zSignal) set.add(zSignal);
    if (kind !== "scatter3d" && colorBy !== "none" && colorBy !== "time")
      set.add(colorBy);
    return [...set];
  }, [xSignal, ySignals, zSignal, colorBy, kind]);

  // A pair fetch is runnable once we have the axes the kind requires.
  const pairReady = useMemo(() => {
    if (kind === "scatter3d")
      return !!xSignal && ySignals.length >= 1 && !!zSignal;
    return !!xSignal && ySignals.length >= 1;
  }, [kind, xSignal, ySignals, zSignal]);

  const serializedQuery = useMemo(() => serializeQuery(queryAst), [queryAst]);
  const queryRunnable = queryAst.filters.every((f) => f.value.trim() !== "");

  // Fetch aligned pairs for scatter/path/scatter3d.
  useEffect(() => {
    if (!vehicleId || !isPairKind || !pairReady) return;
    let cancelled = false;
    setLoading(true);
    fetchPairs({
      vehicleId,
      signals: pairSignals,
      startIso,
      endIso,
    })
      .then((resp) => {
        if (!cancelled) setPairs(resp);
      })
      .catch((e) => {
        if (!cancelled) notify.error(getAxiosErrorMessage(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    vehicleId,
    vehicleType,
    isPairKind,
    pairReady,
    pairSignals.join(","),
    startIso,
    endIso,
  ]);

  // Fetch categorical aggregates for bar/pie via /query/run (same path as
  // SignalWidget) — no new backend needed.
  useEffect(() => {
    if (!vehicleId || !isCategorical || !queryRunnable) return;
    let cancelled = false;
    setLoading(true);
    axios
      .post(
        `${BACKEND_URL}/query/run`,
        {
          query: serializedQuery,
          vehicle_id: vehicleId,
          start: startIso,
          end: endIso,
          interval: "1d",
        },
        { headers: authHeader() },
      )
      .then((res) => {
        if (!cancelled) setCategorical(res.data.data?.series ?? []);
      })
      .catch((e) => {
        if (!cancelled) notify.error(getAxiosErrorMessage(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    vehicleId,
    vehicleType,
    isCategorical,
    queryRunnable,
    serializedQuery,
    startIso,
    endIso,
  ]);

  const config: PlotConfig = useMemo(
    () => ({
      kind,
      xSignal,
      ySignals,
      zSignal,
      colorBy: colorBy === "none" ? undefined : colorBy,
    }),
    [kind, xSignal, ySignals, zSignal, colorBy],
  );

  const chartInstance = useRef<ECharts | null>(null);
  const handleReady = (inst: ECharts | null) => {
    chartInstance.current = inst;
  };

  // Adapt the fetched XY rows into the time-`Series` shape so the shared
  // ExportDialog (and seriesToCsv/Json) can serialize the underlying data —
  // bar/pie already have real Series. PNG/clipboard export works for every
  // kind regardless.
  const exportSeries = useMemo<Series[]>(
    () => (isCategorical ? categorical : pairsToSeries(pairs)),
    [isCategorical, categorical, pairs],
  );

  const hasData = isCategorical
    ? categorical.length > 0
    : pairs.rows.length > 0;

  // Single-pick handler that toggles a value in/out of the (possibly
  // single-element) selection. Scatter allows multiple Y; path/3d take one.
  const allowMultiY = kind === "scatter";
  const toggleY = (id: string) =>
    setYSignals((prev) => {
      if (prev.includes(id)) return prev.filter((y) => y !== id);
      return allowMultiY ? [...prev, id] : [id];
    });

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-1 flex-wrap items-end gap-3">
            {/* Plot kind */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Plot</span>
              <Select
                value={kind}
                onValueChange={(v) => setKind(v as PlotKind)}
              >
                <SelectTrigger className="h-9 w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KIND_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isPairKind && (
              <>
                <SignalPicker
                  label="X"
                  value={xSignal}
                  signalOptions={signalOptions}
                  onSelect={(id) =>
                    setXSignal((cur) => (cur === id ? undefined : id))
                  }
                  isSelected={(id) => xSignal === id}
                />
                <SignalPicker
                  label={allowMultiY ? "Y (one or more)" : "Y"}
                  value={
                    ySignals.length === 0
                      ? undefined
                      : ySignals.length === 1
                        ? ySignals[0]
                        : `${ySignals.length} signals`
                  }
                  signalOptions={signalOptions}
                  onSelect={toggleY}
                  isSelected={(id) => ySignals.includes(id)}
                />
                {kind === "scatter3d" && (
                  <SignalPicker
                    label="Z"
                    value={zSignal}
                    signalOptions={signalOptions}
                    onSelect={(id) =>
                      setZSignal((cur) => (cur === id ? undefined : id))
                    }
                    isSelected={(id) => zSignal === id}
                  />
                )}
                {kind !== "scatter3d" && (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">
                      Color by
                    </span>
                    <Select value={colorBy} onValueChange={setColorBy}>
                      <SelectTrigger className="h-9 w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="time">Time</SelectItem>
                        {signalNames.map((n) => (
                          <SelectItem key={n} value={n}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            {isCategorical && (
              <div className="flex-1">
                <QueryBuilder
                  value={queryAst}
                  onChange={setQueryAst}
                  signalNames={signalNames}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasData && (
              <button
                type="button"
                onClick={() => setExportOpen(true)}
                title="Export"
                className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Download className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onToggleHide}
              title={hidden ? "Show chart" : "Hide chart"}
              className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {hidden ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={onDelete}
              title="Delete widget"
              className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        {!hidden && (
          <CardTitle className="text-base">
            {isCategorical
              ? "Categorical aggregate"
              : kind === "path"
                ? "Track path"
                : kind === "scatter3d"
                  ? "3D scatter"
                  : "Signal scatter"}
          </CardTitle>
        )}
      </CardHeader>
      {!hidden && (
        <CardContent>
          {loading ? (
            <div className="flex h-[320px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !hasData ? (
            <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
              {isPairKind
                ? "Pick the axis signals to plot"
                : "No data in this window"}
            </div>
          ) : (
            <PlotChart
              config={config}
              pairs={pairs}
              categorical={categorical}
              onReady={handleReady}
            />
          )}
        </CardContent>
      )}
      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        getInstance={() => chartInstance.current}
        visibleSeries={exportSeries}
        allSeries={exportSeries}
        chartHidden={hidden}
        defaultFilename="plot"
      />
    </Card>
  );
}

/** A single-axis signal picker: a labeled trigger button that opens the
 *  searchable SignalTree in a popover. Reused for X / Y / Z. */
function SignalPicker({
  label,
  value,
  signalOptions,
  onSelect,
  isSelected,
}: {
  label: string;
  value: string | undefined;
  signalOptions: { id: string }[];
  onSelect: (id: string) => void;
  isSelected: (id: string) => boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-9 w-[180px] justify-start">
            <span className="truncate font-mono text-xs">
              {value ?? "Select signal"}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <SignalTree
            signals={signalOptions}
            isSelected={isSelected}
            onSelect={onSelect}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

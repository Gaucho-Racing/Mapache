import { useEffect, useMemo, useState } from "react";
import type { Lap } from "@/models/session";
import { BACKEND_URL } from "@/consts/config";
import { getAxiosErrorMessage } from "@/lib/axios-error-handler";
import { http } from "@/lib/http";
import { notify } from "@/lib/notify";
import { fetchPairs, type PairsResponse } from "@/lib/pairs";
import type { Query, Rollup } from "@/lib/query";
import { computeDerivedSeries, type DerivedResult } from "@/lib/derived";
import { evaluateHighlights, type Highlight } from "@/components/signals/Highlights";
import type { Series } from "@/components/signals/QueryChart";
import type { RejectStatsEntry } from "@/components/signals/QueryBuilder";

/** A runnable fetch statement as the widget resolves it pre-request. */
export interface RunnableFetch {
  id: string;
  query: Query;
  mql: string;
  runnable: boolean;
}

/** One trace statement's fetched result — base series plus inline error / reject
 *  summary / latency, in the backend's {message, position} error shape. */
export interface FetchResult {
  /** The owning statement id (for inline error placement). */
  id: string;
  series: Series[];
  /** Per-statement parse/run error in the backend's {message, position} shape. */
  error?: { message: string; position?: number };
  /** Cut-summary from `.reject(...)`; null when the query has no reject clause. */
  rejectStats?: RejectStatsEntry[] | null;
  ms: number | null;
}

export interface UseRunSeriesArgs {
  vehicleId: string;
  vehicleType: string;
  startIso: string;
  endIso: string;
  rangeSeconds: number;
  interval: Rollup;
  path: "timeseries" | "categorical" | "pairs";
  runnableFetches: RunnableFetch[];
  /** Debounced stable key over the runnable wire forms + interval. */
  debouncedFetchKey: string;
}

export interface UseRunSeriesResult {
  fetchResults: FetchResult[];
  loadingSeries: boolean;
  /** Shared with the pairs effect so a single loading flag drives the UI. */
  setLoadingSeries: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Run every runnable fetch in parallel against /query/run with the shared
 * interval, owning `fetchResults` + `loadingSeries`. The effect's cancellation
 * guard (`shouldApply`) drops a stale response, so a fast timeframe change can't
 * let an earlier Promise.all clobber a newer one. `setLoadingSeries` is returned
 * so the sibling pairs effect drives the same flag (one loading state, exactly
 * as the inlined version did).
 */
export function useRunSeries({
  vehicleId,
  vehicleType,
  startIso,
  endIso,
  rangeSeconds,
  interval,
  path,
  runnableFetches,
  debouncedFetchKey,
}: UseRunSeriesArgs): UseRunSeriesResult {
  const [fetchResults, setFetchResults] = useState<FetchResult[]>([]);
  const [loadingSeries, setLoadingSeries] = useState(false);

  // Run every runnable fetch in parallel against /query/run with the shared
  // interval; concatenation order follows `runnableFetches`. `shouldApply`
  // lets the caller drop a stale response (a fast timeframe change can let an
  // earlier Promise.all resolve after a newer one).
  const runFetches = async (shouldApply: () => boolean) => {
    setLoadingSeries(true);
    try {
      const results = await Promise.all(
        runnableFetches.map(async (p): Promise<FetchResult> => {
          const startedAt = performance.now();
          try {
            const res = await http.post(
              `${BACKEND_URL}/query/run`,
              {
                query: p.mql,
                vehicle_id: vehicleId,
                start: startIso,
                end: endIso,
                interval,
              },
            );
            return {
              id: p.id,
              series: res.data.data?.series ?? [],
              rejectStats: res.data.data?.reject_stats ?? null,
              ms: Math.round(performance.now() - startedAt),
            };
          } catch (e) {
            // Parser errors come back 400 with {message, position} — surface
            // inline under the offending statement and keep the rest.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const body: any = (e as any)?.response?.data?.data;
            const error =
              body && typeof body.message === "string"
                ? { message: body.message, position: body.position }
                : { message: getAxiosErrorMessage(e) };
            if (!body || typeof body.message !== "string") {
              notify.error(getAxiosErrorMessage(e));
            }
            return { id: p.id, series: [], error, ms: null };
          }
        }),
      );
      if (shouldApply()) setFetchResults(results);
    } finally {
      if (shouldApply()) setLoadingSeries(false);
    }
  };

  useEffect(() => {
    if (!vehicleId) return;
    // The pairs path has its own /query/pairs effect; categorical runs here.
    if (path === "pairs") return;
    if (runnableFetches.length === 0) {
      setFetchResults([]);
      return;
    }
    let cancelled = false;
    runFetches(() => !cancelled);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId, vehicleType, rangeSeconds, debouncedFetchKey, startIso, endIso, path]);

  return { fetchResults, loadingSeries, setLoadingSeries };
}

export interface UsePairsDataArgs {
  vehicleId: string;
  vehicleType: string;
  startIso: string;
  endIso: string;
  path: "timeseries" | "categorical" | "pairs";
  pairReady: boolean;
  pairFetchSignals: string[];
  /** Debounced join of the axis signals. */
  debouncedPairKey: string;
  /** Shared loading setter from useRunSeries so one flag drives the UI. */
  setLoadingSeries: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Pairs path: fetch the resolved axis signals via /query/pairs, owning
 * `pairsData`. Drives the shared `loadingSeries` flag (passed in) and uses the
 * same cancellation guard as the inlined effect.
 */
export function usePairsData({
  vehicleId,
  vehicleType,
  startIso,
  endIso,
  path,
  pairReady,
  pairFetchSignals,
  debouncedPairKey,
  setLoadingSeries,
}: UsePairsDataArgs): { pairsData: PairsResponse } {
  const [pairsData, setPairsData] = useState<PairsResponse>({
    columns: ["produced_at"],
    rows: [],
  });

  useEffect(() => {
    if (path !== "pairs") return;
    if (!vehicleId || !pairReady) {
      setPairsData({ columns: ["produced_at"], rows: [] });
      return;
    }
    let cancelled = false;
    setLoadingSeries(true);
    fetchPairs({ vehicleId, signals: pairFetchSignals, startIso, endIso })
      .then((resp) => {
        if (!cancelled) setPairsData(resp);
      })
      .catch((e) => {
        if (!cancelled) notify.error(getAxiosErrorMessage(e));
      })
      .finally(() => {
        if (!cancelled) setLoadingSeries(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    path,
    vehicleId,
    vehicleType,
    pairReady,
    debouncedPairKey,
    startIso,
    endIso,
  ]);

  return { pairsData };
}

/** An expression statement reduced to the evaluator's DerivedTrace shape. */
export interface ExprTrace {
  id: string;
  name?: string;
  label: string;
  expression: string;
}

export interface UseDerivedResult {
  /** Per-trace derived series / inline error, in trace order. */
  derivedResults: DerivedResult[];
  /** Highlight band ranges resolved against the base series + laps. */
  highlightRanges: ReturnType<typeof evaluateHighlights>["ranges"];
  /** Per-highlight parse/eval errors keyed by highlight id. */
  highlightErrors: ReturnType<typeof evaluateHighlights>["errors"];
}

/**
 * Wrap the in-browser derive pipeline: evaluate expression traces over the base
 * series (`computeDerivedSeries`, in order so a named result feeds a later one)
 * and resolve highlight bands (`evaluateHighlights`). Pure memoization — same
 * inputs, same outputs as the inlined version.
 */
export function useDerived(
  baseSeries: Series[],
  exprTraces: ExprTrace[],
  highlights: Highlight[],
  laps: Lap[] | null | undefined,
): UseDerivedResult {
  const derivedResults = useMemo(
    () => computeDerivedSeries(baseSeries, exprTraces),
    [baseSeries, exprTraces],
  );

  const { ranges: highlightRanges, errors: highlightErrors } = useMemo(
    () => evaluateHighlights(baseSeries, highlights, laps),
    [baseSeries, highlights, laps],
  );

  return { derivedResults, highlightRanges, highlightErrors };
}

import { MutableRefObject, useEffect, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { BACKEND_URL, BACKEND_WS_URL } from "@/consts/config";
import { Signal } from "@/models/signal";

export type LiveTransport = "ws" | "sse";

export interface LiveSignalState {
  id?: string;
  name: string;
  value: number;
  rawValue: number;
  producedAt: number;
  lastSeen: number;
  count: number;
}

export interface SeriesPoint {
  t: number; // produced_at as unix ms
  v: number;
}

interface UseLiveSignalsArgs {
  vehicleId: string | undefined;
  transport: LiveTransport;
  // CSV-style subscription, e.g. "*" for the firehose.
  signals: string;
  backfillSec: number;
  // Server-side coalesce rate (Hz). Honored by WS; SSE ignores it.
  rateHz: number;
  // Window kept per-signal in seriesRef. Older points evicted on insert.
  seriesWindowMs: number;
  // Caller-owned refs so DebugPage can pass them straight into table/graph
  // children without going through this hook's render. The hook is meant to
  // run inside a memo'd null-component so signal-rate state churn in
  // useWebSocket / setSseReady doesn't bubble up to the page.
  latestRef: MutableRefObject<Map<string, LiveSignalState>>;
  seriesRef: MutableRefObject<Map<string, SeriesPoint[]>>;
  totalRef: MutableRefObject<number>;
  backfillRef: MutableRefObject<number>;
  onReadyChange: (state: ReadyState) => void;
}

// useLiveSignals consumes the live service (WS or SSE) and mirrors every
// signal into the caller-supplied refs. Two transports, one payload shape:
// a backfill array of Signals up front, then a stream of individual Signal
// objects.
export function useLiveSignals(args: UseLiveSignalsArgs): void {
  const {
    vehicleId,
    transport,
    signals,
    backfillSec,
    rateHz,
    seriesWindowMs,
    latestRef,
    seriesRef,
    totalRef,
    backfillRef,
    onReadyChange,
  } = args;

  // Reset refs on connection-target change — otherwise switching vehicle /
  // transport leaves stale signals lying around.
  useEffect(() => {
    latestRef.current = new Map();
    seriesRef.current = new Map();
    totalRef.current = 0;
    backfillRef.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId, transport, signals]);

  const apply = (sig: Signal, isBackfill: boolean) => {
    if (!sig.name) return;
    totalRef.current += 1;
    if (isBackfill) backfillRef.current += 1;

    const producedAt = new Date(sig.produced_at).getTime();
    const existing = latestRef.current.get(sig.name);
    latestRef.current.set(sig.name, {
      id: sig.id,
      name: sig.name,
      value: sig.value,
      rawValue: sig.raw_value,
      producedAt,
      lastSeen: Date.now(),
      count: (existing?.count ?? 0) + 1,
    });

    let series = seriesRef.current.get(sig.name);
    if (!series) {
      series = [];
      seriesRef.current.set(sig.name, series);
    }
    series.push({ t: producedAt, v: sig.value });
    // Prune by wall clock so the window is consistent even if produced_at
    // drifts. One shift per insert is amortized O(1) for in-order arrivals.
    const cutoff = Date.now() - seriesWindowMs;
    while (series.length > 0 && series[0].t < cutoff) {
      series.shift();
    }
  };

  // ---------- WS ----------

  const wsUrl =
    transport === "ws" && vehicleId
      ? `${BACKEND_WS_URL}/live/ws?${new URLSearchParams({
          vehicle_id: vehicleId,
          signals,
          backfill: String(backfillSec),
          rate: String(rateHz),
        }).toString()}`
      : null;

  const { lastMessage, readyState: wsReady } = useWebSocket(wsUrl, {
    shouldReconnect: () => true,
  });

  useEffect(() => {
    if (transport !== "ws") return;
    onReadyChange(wsReady);
  }, [transport, wsReady, onReadyChange]);

  useEffect(() => {
    if (transport !== "ws") return;
    if (!lastMessage) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(lastMessage.data);
    } catch {
      return;
    }
    // First frame is the backfill array (possibly empty); subsequent
    // frames are single Signal objects. See live/api/stream_ws.go.
    if (Array.isArray(parsed)) {
      for (const sig of parsed as Signal[]) apply(sig, true);
    } else {
      apply(parsed as Signal, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessage, transport]);

  // ---------- SSE ----------

  const [, setSseReady] = useState<ReadyState>(ReadyState.UNINSTANTIATED);

  useEffect(() => {
    if (transport !== "sse") return;
    if (!vehicleId) return;

    onReadyChange(ReadyState.CONNECTING);
    setSseReady(ReadyState.CONNECTING);

    const url = `${BACKEND_URL}/live/sse?${new URLSearchParams({
      vehicle_id: vehicleId,
      signals,
      backfill: String(backfillSec),
    }).toString()}`;
    const es = new EventSource(url);

    es.onopen = () => {
      onReadyChange(ReadyState.OPEN);
      setSseReady(ReadyState.OPEN);
    };
    es.onerror = () => {
      // EventSource auto-reconnects unless it hit CLOSED.
      const state =
        es.readyState === EventSource.CLOSED
          ? ReadyState.CLOSED
          : ReadyState.CONNECTING;
      onReadyChange(state);
      setSseReady(state);
    };

    const onBackfill = (e: MessageEvent) => {
      try {
        const arr = JSON.parse(e.data) as Signal[];
        for (const sig of arr) apply(sig, true);
      } catch {
        /* ignore malformed event */
      }
    };
    const onSignal = (e: MessageEvent) => {
      try {
        apply(JSON.parse(e.data) as Signal, false);
      } catch {
        /* ignore malformed event */
      }
    };
    es.addEventListener("backfill", onBackfill);
    es.addEventListener("signal", onSignal);

    return () => {
      es.removeEventListener("backfill", onBackfill);
      es.removeEventListener("signal", onSignal);
      es.close();
      onReadyChange(ReadyState.CLOSED);
      setSseReady(ReadyState.CLOSED);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transport, vehicleId, signals, backfillSec]);
}

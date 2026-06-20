// Opens an SSE subscription to the live service and surfaces a monotonic
// `tick` that bumps every time fresh samples arrive (throttled to one bump
// per `throttleMs`). Consumers include `tick` in their query/fetch key so
// the data layer re-pulls from /query/run as soon as new signals land.
//
// The hook does NOT do any client-side aggregation — the backend stays the
// source of truth for bucket math (which is gnarly to mirror correctly
// across all the MQL aggregators). SSE is purely a wake-up signal so the
// dashboard's rolling-window chart updates in near-real-time instead of
// the slower setInterval polling cadence.
//
//   const { tick } = useLiveTrigger({
//     vehicleId,
//     signalPatterns: ["ecu_acc_pedal", "ecu_*"],
//     enabled: isRolling,
//     throttleMs: 500,
//   });
//
// Empty signalPatterns or enabled=false means "do nothing"; the hook
// returns tick=0 and never opens a connection.

import { useEffect, useRef, useState } from "react";
import { BACKEND_URL } from "@/consts/config";

interface UseLiveTriggerArgs {
  vehicleId: string;
  /** Signal names (or globs — same syntax `/live/sse?signals=` accepts). */
  signalPatterns: string[];
  /** When false the hook is a no-op (no connection, no tick bumps). */
  enabled: boolean;
  /** Minimum gap between consecutive tick bumps. A high-rate signal
   *  storm would otherwise flood downstream effects with refetches. */
  throttleMs?: number;
}

export interface UseLiveTriggerResult {
  /** Monotonic counter. Increments on each throttled batch of samples. */
  tick: number;
  /** "open" once the SSE handshake completes; "error" on dropped
   *  connection. Surfaces in the parent's status indicator if it
   *  wants to show "live" / "live offline" badges. */
  status: "idle" | "open" | "error";
}

export function useLiveTrigger({
  vehicleId,
  signalPatterns,
  enabled,
  throttleMs = 500,
}: UseLiveTriggerArgs): UseLiveTriggerResult {
  const [tick, setTick] = useState(0);
  const [status, setStatus] = useState<"idle" | "open" | "error">("idle");

  // Stable key for the patterns so identical sets across renders don't
  // tear down + reopen the SSE. Sort to absorb caller ordering drift.
  const patternsKey = signalPatterns
    .slice()
    .sort()
    .join(",");

  // Track the last tick-bump time so a high-rate signal storm doesn't
  // flood the downstream refetch effect. Kept in a ref so the throttle
  // doesn't reset across renders.
  const lastBumpRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return;
    }
    if (!vehicleId || !patternsKey) {
      setStatus("idle");
      return;
    }

    const url = new URL(`${BACKEND_URL}/live/sse`, window.location.origin);
    url.searchParams.set("vehicle_id", vehicleId);
    url.searchParams.set("signals", patternsKey);
    // `backfill=0` because we just pulled the historical query — we
    // don't want SSE to replay the same window we already rendered.
    url.searchParams.set("backfill", "0");

    const es = new EventSource(url.toString());

    es.addEventListener("open", () => setStatus("open"));
    es.addEventListener("error", () => setStatus("error"));

    const onSignal = () => {
      const now = Date.now();
      if (now - lastBumpRef.current < throttleMs) return;
      lastBumpRef.current = now;
      setTick((n) => n + 1);
    };
    // The live service emits two named event types: `backfill` (initial,
    // possibly empty) and `signal` (each new sample). The backfill event
    // is intentionally ignored — historical data is already on the
    // chart from /query/run.
    es.addEventListener("signal", onSignal);

    return () => {
      es.removeEventListener("signal", onSignal);
      es.close();
      setStatus("idle");
    };
  }, [enabled, vehicleId, patternsKey, throttleMs]);

  return { tick, status };
}

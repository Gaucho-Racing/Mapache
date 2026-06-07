import { LoadingComponent } from "@/components/Loading";
import { Card } from "@/components/ui/card";
import { useEffect, useState, useRef } from "react";
import { BACKEND_WS_URL } from "@/consts/config";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { Signal } from "@/models/signal";
import { useVehicleList } from "@/lib/store";
import { useNow } from "@/context/time-context";
import React from "react";

interface LiveWidgetProps {
  vehicle_id: string;
  signals: string[];
  dataLength?: number;
  showDeltaBanner?: boolean;
  alwaysShowData?: boolean;
  width?: number;
  height?: number;
  className?: string;
  children: (
    data: Map<string, Signal[]>,
    currentSignals: Map<string, Signal>,
    lastMessageTime: number,
    isOutOfSync: boolean,
  ) => React.ReactNode;
}

// Coalesce rate in Hz — matches the debug page.
const RATE_HZ = 5;

export default function LiveWidget({
  vehicle_id,
  signals,
  dataLength = 20,
  showDeltaBanner = false,
  alwaysShowData = false,
  width = 350,
  height = 220,
  className,
  children,
}: LiveWidgetProps) {
  const vehicleList = useVehicleList();
  const vehicleType = vehicleList.find((v) => v.id === vehicle_id)?.type;

  const socketUrl =
    vehicle_id && vehicleType && signals.length > 0
      ? `${BACKEND_WS_URL}/live/ws?${new URLSearchParams({
          vehicle_id,
          signals: signals.join(","),
          backfill: "30",
          rate: String(RATE_HZ),
        }).toString()}`
      : null;

  const { lastMessage, readyState } = useWebSocket(socketUrl, {
    shouldReconnect: () => true,
  });

  const [data, setData] = useState<Map<string, Signal[]>>(new Map());
  const [currentSignals, setCurrentSignals] = useState<Map<string, Signal>>(
    new Map(),
  );
  const [lastMessageTime, setLastMessageTime] = useState<number>(0);

  // Track backfill frame IDs so we can drop duplicates once the backfill
  // has been applied and live stream starts.
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Reset on connection change
    setData(new Map());
    setCurrentSignals(new Map());
    setLastMessageTime(0);
    seenRef.current = new Set();
  }, [socketUrl]);

  useEffect(() => {
    if (lastMessage === null) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(lastMessage.data);
    } catch {
      return;
    }

    // First frame is the backfill array; subsequent frames are single Signals.
    // See live/api/stream_ws.go.
    const items: Signal[] = Array.isArray(parsed) ? parsed : [parsed];

    for (const sig of items) {
      if (!sig.name) continue;

      // Dedup against backfill IDs so we don't double-count the same record.
      if (sig.id && seenRef.current.has(sig.id)) continue;
      if (sig.id) seenRef.current.add(sig.id);

      setData((prev) => {
        const newData = new Map(prev);
        const existing = newData.get(sig.name) || [];
        const updated = [sig, ...existing.slice(0, dataLength - 1)];
        newData.set(sig.name, updated);
        return newData;
      });
      setCurrentSignals((prev) => {
        const newMap = new Map(prev);
        newMap.set(sig.name, sig);
        return newMap;
      });
      setLastMessageTime((prev) =>
        Math.max(prev, new Date(sig.produced_at).getTime()),
      );
    }
  }, [lastMessage, dataLength]);

  const connectionStatus = {
    [ReadyState.CONNECTING]: "Connecting",
    [ReadyState.OPEN]: "Open",
    [ReadyState.CLOSING]: "Closing",
    [ReadyState.CLOSED]: "Closed",
    [ReadyState.UNINSTANTIATED]: "Uninstantiated",
  }[readyState];

  const FailureCard = () => {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Failed to Load Widget</h3>
          <p className="text-sm text-muted-foreground">{connectionStatus}</p>
        </div>
      </div>
    );
  };

  const NoDataCard = () => {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-6 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-500" />
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Connected</h3>
          <p className="text-sm text-muted-foreground">
            Waiting for live signal data to come in...
          </p>
        </div>
      </div>
    );
  };

  const SyncWarning = () => {
    const currentTime = useNow();
    const delta = Math.abs(Math.round(lastMessageTime - currentTime));
    if (delta > 500) {
      return (
        <div className="absolute right-2 top-2 z-10">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
        </div>
      );
    }
    return null;
  };

  const DeltaBanner = () => {
    const currentTime = useNow();

    const delta = Math.round(lastMessageTime - currentTime);
    const textColor =
      Math.abs(delta) < 500 ? "text-neutral-400" : "text-yellow-500";

    return (
      <div className="absolute bottom-2 right-2 z-10">
        <p className={`text-xs ${textColor}`}>
          Delta: {delta > 0 ? "+" : ""}
          {delta}ms
        </p>
      </div>
    );
  };

  return (
    <Card
      style={{ width, height }}
      className={`relative flex-shrink-0 ${className ?? ""}`}
    >
      {readyState === ReadyState.CLOSED ? (
        <FailureCard />
      ) : readyState === ReadyState.OPEN ? (
        data.size === 0 && !alwaysShowData ? (
          <NoDataCard />
        ) : (
          <>
            <SyncWarning />
            {children(data, currentSignals, lastMessageTime, false)}
            {showDeltaBanner && <DeltaBanner />}
          </>
        )
      ) : (
        <LoadingComponent />
      )}
    </Card>
  );
}

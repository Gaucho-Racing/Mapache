import { LoadingComponent } from "@/components/Loading";
import { Card } from "@/components/ui/card";
import { useCallback, useEffect, useState } from "react";
import { BACKEND_URL } from "@/consts/config";
import { BACKEND_WS_URL } from "@/consts/config";
import axios from "axios";
import { getAxiosErrorMessage } from "@/lib/axios-error-handler";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  Database,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatTimeWithMillis } from "@/lib/utils";
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
  children: (
    data: Map<string, Signal[]>,
    currentSignals: Map<string, Signal>,
    lastMessageTime: number,
    isOutOfSync: boolean,
  ) => React.ReactNode;
}

export default function LiveWidget({
  vehicle_id,
  signals,
  dataLength = 20,
  showDeltaBanner = false,
  alwaysShowData = false,
  width = 350,
  height = 220,
  children,
}: LiveWidgetProps) {
  const [socketUrl, setSocketUrl] = useState(`${BACKEND_WS_URL}/gr25/live`);
  const { lastMessage, readyState } = useWebSocket(socketUrl);

  const [data, setData] = useState<Map<string, Signal[]>>(new Map());
  const [currentSignals, setCurrentSignals] = useState<Map<string, Signal>>(
    new Map(),
  );
  const [lastMessageTime, setLastMessageTime] = useState<number>(0);

  const vehicleList = useVehicleList();

  useEffect(() => {
    connectWebsocket();
  }, [vehicle_id, signals, vehicleList]);

  useEffect(() => {
    if (lastMessage !== null) {
      const message = JSON.parse(lastMessage.data) as Signal;
      setData((prev) => {
        const newData = new Map(prev);
        const existingSignals = newData.get(message.name) || [];
        const updatedSignals = [
          message,
          ...existingSignals.slice(0, dataLength - 1),
        ];
        newData.set(message.name, updatedSignals);
        return newData;
      });
      setCurrentSignals((prev) => {
        const newSignals = new Map(prev);
        newSignals.set(message.name, message);
        return newSignals;
      });
      setLastMessageTime(new Date(message.produced_at).getTime());
    }
  }, [lastMessage]);

  const connectionStatus = {
    [ReadyState.CONNECTING]: "Connecting",
    [ReadyState.OPEN]: "Open",
    [ReadyState.CLOSING]: "Closing",
    [ReadyState.CLOSED]: "Closed",
    [ReadyState.UNINSTANTIATED]: "Uninstantiated",
  }[readyState];

  const connectWebsocket = async () => {
    const vehicleType = tryFindVehicleType(vehicle_id);
    if (!vehicleType) return;

    const params = new URLSearchParams();

    params.append("signals", signals.join(","));
    params.append("vehicle_id", vehicle_id);

    setSocketUrl(`${BACKEND_WS_URL}/${vehicleType}/live?${params.toString()}`);
  };

  const tryFindVehicleType = (vehicle_id: string) => {
    const vehicle = vehicleList.find((v) => v.id === vehicle_id);
    if (!vehicle) return null;
    return vehicle.type;
  };

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
    <Card style={{ width, height }} className="relative flex-shrink-0">
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

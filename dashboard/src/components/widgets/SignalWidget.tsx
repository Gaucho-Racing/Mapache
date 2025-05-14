import { LoadingComponent } from "@/components/Loading";
import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { BACKEND_URL } from "@/consts/config";
import axios from "axios";
import { getAxiosErrorMessage } from "@/lib/axios-error-handler";
import { AlertCircle, AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatTimeWithMillis } from "@/lib/utils";

interface SignalWidgetProps {
  vehicle_id: string;
  start_time: string;
  end_time: string;
  current_millis: number;
  signals: string[];
  showDeltaBanner?: boolean;
  children: (
    data: any[],
    currentSignals: any,
    isOutOfSync: boolean,
  ) => React.ReactNode;
}

export default function SignalWidget({
  vehicle_id,
  start_time,
  end_time,
  current_millis,
  signals,
  showDeltaBanner = false,
  children,
}: SignalWidgetProps) {
  const [data, setData] = useState<any>([]);
  const [currentSignals, setCurrentSignals] = useState<any>({});
  const [queryStatus, setQueryStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    querySignals();
  }, [start_time, end_time]);

  useEffect(() => {
    matchNearestSignal();
  }, [data, current_millis]);

  const querySignals = async () => {
    const params = new URLSearchParams();

    if (signals.length > 0) {
      params.append("signals", signals.join(","));
    }
    if (vehicle_id) {
      params.append("vehicle_id", vehicle_id);
    }
    if (start_time) {
      params.append("start", start_time.slice(0, -1));
    }
    if (end_time) {
      params.append("end", end_time.slice(0, -1));
    }
    params.append("merge", "largest");
    params.append("fill", "forward");

    try {
      setQueryStatus("loading");
      const response = await axios.get(
        `${BACKEND_URL}/query/signals?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
          },
        },
      );
      if (response.status === 200) {
        setQueryStatus("success");
        setData(response.data.data.data);
      } else {
        setQueryStatus("error");
        setErrorMessage(response.data.data.message);
      }
    } catch (error) {
      setErrorMessage(getAxiosErrorMessage(error));
      setQueryStatus("error");
    }
  };

  const matchNearestSignal = () => {
    if (data.length === 0) {
      setCurrentSignals({});
      return;
    }
    const startTimeMs = new Date(start_time).getTime();
    const nearestSignal = data.reduce(
      (prev: Record<string, any>, curr: Record<string, any>) => {
        const prevTime = new Date(prev.produced_at).getTime() - startTimeMs;
        const currTime = new Date(curr.produced_at).getTime() - startTimeMs;
        return Math.abs(currTime - current_millis) <
          Math.abs(prevTime - current_millis)
          ? curr
          : prev;
      },
      data[0],
    );
    setCurrentSignals(nearestSignal);
  };

  const isSignalOutOfSync = () => {
    if (!currentSignals.produced_at) return false;
    const startTimeMs = new Date(start_time).getTime();
    const signalTime =
      new Date(currentSignals.produced_at).getTime() - startTimeMs;
    return Math.abs(signalTime - current_millis) > 500;
  };

  const FailureCard = () => {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Failed to Load Widget</h3>
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
        </div>
      </div>
    );
  };

  const SyncWarning = () => {
    if (!isSignalOutOfSync()) return null;
    return (
      <div className="absolute right-2 top-2 z-10">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                Playback time:{" "}
                {formatTimeWithMillis(
                  new Date(new Date(start_time).getTime() + current_millis),
                )}
              </p>
              <p className="text-xs">
                Signal time:{" "}
                {formatTimeWithMillis(new Date(currentSignals.produced_at))}
              </p>
              <p className="text-xs text-yellow-500">
                Delta:{" "}
                {(() => {
                  const delta = Math.round(
                    new Date(currentSignals.produced_at).getTime() -
                      (new Date(start_time).getTime() + current_millis),
                  );
                  return `${delta > 0 ? "+" : ""}${delta}ms`;
                })()}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  };

  const DeltaBanner = () => {
    return (
      <div className="absolute bottom-2 right-2 z-10">
        {(() => {
          const delta = Math.round(
            new Date(currentSignals.produced_at).getTime() -
              (new Date(start_time).getTime() + current_millis),
          );
          const textColor =
            Math.abs(delta) < 500 ? "text-neutral-400" : "text-yellow-500";
          return (
            <p className={`text-xs ${textColor}`}>
              Delta: {delta > 0 ? "+" : ""}
              {delta}ms
            </p>
          );
        })()}
      </div>
    );
  };

  return (
    <Card style={{ width: 350, height: 220 }} className="relative">
      {queryStatus === "error" ? (
        <FailureCard />
      ) : queryStatus === "success" ? (
        <>
          <SyncWarning />
          {children(data, currentSignals, isSignalOutOfSync())}
          {showDeltaBanner && <DeltaBanner />}
        </>
      ) : (
        <LoadingComponent />
      )}
    </Card>
  );
}

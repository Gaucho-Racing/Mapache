import { LoadingComponent } from "@/components/Loading";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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

interface PedalsWidgetProps {
  vehicle_id: string;
  start_time: string;
  end_time: string;
  current_millis: number;
}

export default function PedalsWidget({
  vehicle_id,
  start_time,
  end_time,
  current_millis,
}: PedalsWidgetProps) {
  const [data, setData] = useState<any>([]);
  const [currentSignals, setCurrentSignals] = useState<any>({});
  const [queryStatus, setQueryStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const signals = [
    "pedal_apps_one",
    "pedal_apps_two",
    "pedal_apps_one_raw",
    "pedal_apps_two_raw",
  ];

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
      console.log(`${BACKEND_URL}/query/signals?${params.toString()}`);
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

  return (
    <Card style={{ width: 350, height: 220 }} className="relative">
      {queryStatus === "error" ? (
        <FailureCard />
      ) : queryStatus === "success" ? (
        <>
          {isSignalOutOfSync() && (
            <div className="absolute right-2 top-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      Playback time:{" "}
                      {formatTimeWithMillis(
                        new Date(
                          new Date(start_time).getTime() + current_millis,
                        ),
                      )}
                    </p>
                    <p className="text-xs">
                      Signal time:{" "}
                      {formatTimeWithMillis(
                        new Date(currentSignals.produced_at),
                      )}
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
          )}
          <div className="h-full w-full p-4">
            <div className="flex items-center justify-center">
              <div className="w-1/3 text-start">
                <p>APPS 1:</p>
                <h3>
                  {parseFloat(currentSignals.pedal_apps_one || 0).toFixed(2)}
                </h3>
              </div>
              <div className="w-2/3">
                <Progress
                  value={Math.floor(currentSignals.pedal_apps_one || 0)}
                />
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="w-1/3 text-start">
                <p>APPS 2:</p>
                <h3>
                  {parseFloat(currentSignals.pedal_apps_two || 0).toFixed(2)}
                </h3>
              </div>
              <div className="w-2/3">
                <Progress
                  value={Math.floor(currentSignals.pedal_apps_two || 0)}
                />
              </div>
            </div>
            <Separator className="my-2" />
            <div className="flex items-center justify-between">
              <div className="w-1/2 text-start">
                <p>APPS 1 RAW:</p>
              </div>
              <h3>{currentSignals.pedal_apps_one_raw || 0}</h3>
            </div>
            <div className="flex items-center justify-between">
              <div className="w-1/2 text-start">
                <p>APPS 2 RAW:</p>
              </div>
              <h3>{currentSignals.pedal_apps_two_raw || 0}</h3>
            </div>
          </div>
        </>
      ) : (
        <LoadingComponent />
      )}
    </Card>
  );
}

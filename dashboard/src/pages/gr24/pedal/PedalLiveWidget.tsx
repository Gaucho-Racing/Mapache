import { Loader2 } from "lucide-react";
import React from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleXmark } from "@fortawesome/free-regular-svg-icons";
import { MAPACHE_WS_URL } from "@/consts/config";

function GR24PedalLiveWidget() {
  const [socketUrl] = React.useState(`${MAPACHE_WS_URL}/ws/gr24/pedal`);
  const { lastMessage, readyState } = useWebSocket(socketUrl);

  const LoadingComponent = () => {
    if (readyState === ReadyState.CONNECTING) {
      return (
        <div className="flex h-full flex-col items-center justify-center">
          <Loader2 className="mr-2 h-8 w-8 animate-spin" />
          <p className="mt-2 text-neutral-400">Connecting...</p>
        </div>
      );
    } else if (readyState === ReadyState.CLOSED) {
      return (
        <div className="flex h-full flex-col items-center justify-center">
          <FontAwesomeIcon
            icon={faCircleXmark}
            className="mr-2 h-8 w-8 text-red-500"
          />
          <p className="mt-2 text-neutral-400">Connection Closed</p>
        </div>
      );
    } else {
      return (
        <div className="flex h-full flex-col items-center justify-center">
          <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        </div>
      );
    }
  };

  return (
    <>
      <div className="h-full w-full p-4">
        {lastMessage ? (
          <div className="">
            <div className="flex items-center justify-center">
              <div className="w-1/3 text-start">
                <p>APPS 1:</p>
                <h3>
                  {parseFloat(JSON.parse(lastMessage.data).apps_one).toFixed(2)}
                </h3>
              </div>
              <div className="w-2/3">
                <Progress
                  value={Math.floor(JSON.parse(lastMessage.data).apps_one)}
                />
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="w-1/3 text-start">
                <p>APPS 2:</p>
                <h3>
                  {parseFloat(JSON.parse(lastMessage.data).apps_two).toFixed(2)}
                </h3>
              </div>
              <div className="w-2/3">
                <Progress
                  value={Math.floor(JSON.parse(lastMessage.data).apps_two)}
                />
              </div>
            </div>
            <Separator className="my-2" />
            <div className="flex items-center justify-center">
              <div className="w-1/2 text-start">
                <p>APPS 1 RAW:</p>
              </div>
              <h3>{JSON.parse(lastMessage.data).apps_one_raw}</h3>
            </div>
            <div className="flex items-center justify-center">
              <div className="w-1/2 text-start">
                <p>APPS 2 RAW:</p>
              </div>
              <h3>{JSON.parse(lastMessage.data).apps_two_raw}</h3>
            </div>
          </div>
        ) : (
          <LoadingComponent />
        )}
      </div>
    </>
  );
}

export default GR24PedalLiveWidget;

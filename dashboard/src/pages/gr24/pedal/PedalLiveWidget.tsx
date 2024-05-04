import axios from "axios";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import React, { useCallback } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

function GR24PedalLiveWidget() {
  const [socketUrl] = React.useState("ws://localhost:7001/ws/gr24/pedal");
  const { sendMessage, lastMessage, readyState } = useWebSocket(socketUrl);

  React.useEffect(() => {
    if (lastMessage !== null) {
    }
  }, [lastMessage]);

  const connectionStatus = {
    [ReadyState.CONNECTING]: "Connecting",
    [ReadyState.OPEN]: "Open",
    [ReadyState.CLOSING]: "Closing",
    [ReadyState.CLOSED]: "Closed",
    [ReadyState.UNINSTANTIATED]: "Uninstantiated",
  }[readyState];

  const LoadingComponent = () => {
    return (
      <div className="flex h-full flex-col items-center justify-center p-32">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
      </div>
    );
  };

  return (
    <>
      <div className="h-full w-full bg-green-200 p-4">
        {lastMessage ? (
          <div className="flex flex-row">
            <div className="items-center justify-center bg-sky-500 text-center">
              <div className="">
                <Progress
                  value={Math.floor(JSON.parse(lastMessage.data).apps_one)}
                />
              </div>
              <div className="text-center">
                {parseFloat(JSON.parse(lastMessage.data).apps_one).toFixed(2)}
              </div>
            </div>
            <div className="flex-grow items-center justify-center bg-sky-500 text-center">
              <div className="">
                <Progress
                  value={Math.floor(JSON.parse(lastMessage.data).apps_one)}
                />
              </div>
              <div className="mt-32 text-center">A2:</div>
              <div className="text-center">
                {parseFloat(JSON.parse(lastMessage.data).apps_two).toFixed(2)}
              </div>
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

import { Loader2 } from "lucide-react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleXmark } from "@fortawesome/free-regular-svg-icons";
import { Mobile, initMobile } from "@/models/gr24/mobile";
import { MAPACHE_WS_URL } from "@/consts/config";

function SpeedLiveWidget() {
  const [socketUrl] = React.useState(`${MAPACHE_WS_URL}/ws/gr24/mobile`);
  const { lastMessage, readyState } = useWebSocket(socketUrl);
  const [messageJson, setMessageJson] = useState<Mobile>(initMobile);

  useEffect(() => {
    if (lastMessage !== null) {
      const data = JSON.parse(lastMessage.data);
      setMessageJson(data);
    }
  }, [lastMessage]);

  const getCompassString = () => {
    const compass = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const index = Math.round(messageJson.heading / 45) % 8;
    return compass[index];
  };

  const CompassDisplay = () => {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4 text-center">
        <h1>
          {messageJson.heading.toFixed(1)}° {getCompassString()}
        </h1>
      </div>
    );
  };

  const SpeedDisplay = () => {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center">
        <div className="flex-1">
          <h1 className="text-6xl">
            {(messageJson.speed * 2.23694).toFixed(0)}
          </h1>
          <div className="text-2xl font-semibold">MPH</div>
        </div>
        <div
          className="mx-2 border-l border-gray-400"
          style={{ height: "100px" }}
        ></div>
        <div className="flex-1">
          <h1 className="text-6xl">{(messageJson.speed * 3.6).toFixed(0)}</h1>
          <div className="text-2xl font-semibold">KMPH</div>
        </div>
      </div>
    );
  };

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
      <div className="h-full w-full">
        {lastMessage ? (
          <div className="flex h-full w-full flex-col">
            <div className="mt-8">
              <CompassDisplay />
            </div>
            <div className="flex-1">
              <SpeedDisplay />
            </div>
          </div>
        ) : (
          <LoadingComponent />
        )}
      </div>
    </>
  );
}

export default SpeedLiveWidget;

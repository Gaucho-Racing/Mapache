import { Loader2 } from "lucide-react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleXmark } from "@fortawesome/free-regular-svg-icons";
import { Mobile, initMobile } from "@/models/gr24/mobile";

function DebugLiveWidget() {
  const [socketUrl] = React.useState("ws://localhost:10310/ws/gr24/mobile");
  const { lastMessage, readyState } = useWebSocket(socketUrl);
  const [messageJson, setMessageJson] = useState<Mobile>(initMobile);

  useEffect(() => {
    if (lastMessage !== null) {
      const data = JSON.parse(lastMessage.data);
      setMessageJson(data);
    }
  }, [lastMessage]);

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
          <div>
            <div className="m-4 flex w-full flex-row">
              <div className="flex-1">
                <div className="flex">
                  <div className="pr-2 font-semibold">Latitude:</div>
                  <div className="font-semibold text-gray-400">
                    {messageJson.latitude.toFixed(6)}
                  </div>
                </div>
                <div className="flex">
                  <div className="pr-2 font-semibold">Longitude:</div>
                  <div className="font-semibold text-gray-400">
                    {messageJson.longitude.toFixed(6)}
                  </div>
                </div>
                <div className="flex">
                  <div className="pr-2 font-semibold">Altitude:</div>
                  <div className="font-semibold text-gray-400">
                    {messageJson.altitude.toFixed(6)} m
                  </div>
                </div>
                <div className="flex">
                  <div className="pr-2 font-semibold">Heading:</div>
                  <div className="font-semibold text-gray-400">
                    {messageJson.heading.toFixed(6)} °
                  </div>
                </div>
                <div className="flex">
                  <div className="pr-2 font-semibold">Speed:</div>
                  <div className="font-semibold text-gray-400">
                    {messageJson.speed} m/s
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex">
                  <div className="pr-2 font-semibold">Accelerometer:</div>
                  <div className="font-semibold text-gray-400">
                    <div>x: {messageJson.accelerometer_x.toFixed(8)}</div>
                    <div>y: {messageJson.accelerometer_y.toFixed(8)}</div>
                    <div>z: {messageJson.accelerometer_z.toFixed(8)}</div>
                  </div>
                </div>
                <div className="flex">
                  <div className="pr-2 font-semibold">Gyroscope:</div>
                  <div className="font-semibold text-gray-400">
                    <div>x: {messageJson.gyroscope_x.toFixed(8)}</div>
                    <div>y: {messageJson.gyroscope_y.toFixed(8)}</div>
                    <div>z: {messageJson.gyroscope_z.toFixed(8)}</div>
                  </div>
                </div>
                <div className="flex">
                  <div className="pr-2 font-semibold">Magnetometer:</div>
                  <div className="font-semibold text-gray-400">
                    <div>x: {messageJson.magnetometer_x.toFixed(8)}</div>
                    <div>y: {messageJson.magnetometer_y.toFixed(8)}</div>
                    <div>z: {messageJson.magnetometer_z.toFixed(8)}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mx-4 flex">
              <div className="pr-2 font-semibold">Last Update:</div>
              <div className="font-semibold text-gray-400">
                {new Date(messageJson.created_at).toISOString()}
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

export default DebugLiveWidget;

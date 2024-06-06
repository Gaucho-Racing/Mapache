import { Loader2 } from "lucide-react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import React, { useRef, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleXmark } from "@fortawesome/free-regular-svg-icons";
import { Mobile, initMobile } from "@/models/gr24/mobile";
import { MAPACHE_WS_URL } from "@/consts/config";

function AccelerometerLiveWidget() {
  const [socketUrl] = React.useState(`${MAPACHE_WS_URL}/ws/gr24/mobile`);
  const { lastMessage, readyState } = useWebSocket(socketUrl);
  const [messageJson, setMessageJson] = useState<Mobile>(initMobile);

  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const dotXRef = useRef(100);
  const dotYRef = useRef(100);

  useEffect(() => {
    if (lastMessage !== null) {
      const data = JSON.parse(lastMessage.data);
      setMessageJson(data);
      const x = data.accelerometer_x / 9.80665;
      const y = data.accelerometer_y / 9.80665;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx) return;

      const animateDot = () => {
        const targetX = 100 + x * 40;
        const targetY = 100 + y * 40;

        dotXRef.current += (targetX - dotXRef.current) * 0.5;
        dotYRef.current += (targetY - dotYRef.current) * 0.5;

        // Clear canvas
        ctx.clearRect(0, 0, canvas!.width, canvas!.height);
        ctx.strokeStyle = "gray";

        // Draw x-axis
        ctx.beginPath();
        ctx.moveTo(0, 100);
        ctx.lineTo(200, 100);
        ctx.stroke();

        // Draw y-axis
        ctx.beginPath();
        ctx.moveTo(100, 0);
        ctx.lineTo(100, 200);
        ctx.stroke();

        // Draw concentric rings around the dot
        for (let i = 5; i <= 100; i += 20) {
          ctx.strokeStyle = "gray";
          ctx.beginPath();
          ctx.arc(100, 100, i, 0, 2 * Math.PI);
          ctx.stroke();
        }

        // Label the axis by 0.5
        ctx.fillStyle = "white";
        ctx.font = "10px Arial";
        ctx.fillText("0.5", 100 + 100, 100);
        ctx.fillText("1g", 140, 100);
        ctx.fillText("2g", 180, 100);
        ctx.fillText("-1g", 50, 100);
        ctx.fillText("-2g", 10, 100);
        ctx.fillText("1g", 95, 60);
        ctx.fillText("2g", 95, 20);
        ctx.fillText("-1g", 95, 145);
        ctx.fillText("-2g", 95, 185);

        // Draw dot at the calculated position
        ctx.fillStyle = "#e105a3";
        ctx.beginPath();
        ctx.arc(dotXRef.current, dotYRef.current, 5, 0, 2 * Math.PI);
        ctx.fill();

        requestAnimationFrame(animateDot);
      };
      animateDot();
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
          <div className="relative flex h-full w-full flex-col">
            <canvas ref={canvasRef} width={200} height={200} />
            <div className="absolute" style={{ left: "12px", bottom: "12px" }}>
              <p>X: {(messageJson.accelerometer_x / 9.80665).toFixed(4)} G</p>
              <p>Y: {(messageJson.accelerometer_y / 9.80665).toFixed(4)} G</p>
            </div>
          </div>
        ) : (
          <LoadingComponent />
        )}
      </div>
    </>
  );
}

export default AccelerometerLiveWidget;

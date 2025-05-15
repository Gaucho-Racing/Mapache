import SignalWidget from "../SignalWidget";
import { useRef } from "react";

interface AccelerometerWidgetProps {
  vehicle_id: string;
  start_time: string;
  end_time: string;
  current_millis: number;
  showDeltaBanner?: boolean;
}

export default function AccelerometerWidget({
  vehicle_id,
  start_time,
  end_time,
  current_millis,
  showDeltaBanner = false,
}: AccelerometerWidgetProps) {
  const signals = [
    "mobile_accelerometer_x",
    "mobile_accelerometer_y",
    "mobile_accelerometer_z",
  ];

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotXRef = useRef(100);
  const dotYRef = useRef(100);

  const drawAccelerometer = (accel_x: number, accel_y: number) => {
    if (canvasRef.current !== null) {
      const x = accel_x / 9.80665;
      const y = accel_y / 9.80665;

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
  };

  return (
    <SignalWidget
      vehicle_id={vehicle_id}
      start_time={start_time}
      end_time={end_time}
      current_millis={current_millis}
      signals={signals}
      showDeltaBanner={showDeltaBanner}
      width={300}
      height={300}
    >
      {(_, currentSignals) => {
        drawAccelerometer(
          currentSignals.mobile_accelerometer_x,
          currentSignals.mobile_accelerometer_y,
        );
        return (
          <div className="h-full w-full p-4">
            <div className="relative flex h-full w-full flex-col">
              <canvas ref={canvasRef} width={200} height={200} />
              <div
                className="absolute"
                style={{ left: "12px", bottom: "12px" }}
              >
                <p>
                  X:{" "}
                  {(currentSignals.mobile_accelerometer_x / 9.80665).toFixed(4)}{" "}
                  G
                </p>
                <p>
                  Y:{" "}
                  {(currentSignals.mobile_accelerometer_y / 9.80665).toFixed(4)}{" "}
                  G
                </p>
              </div>
            </div>
          </div>
        );
      }}
    </SignalWidget>
  );
}

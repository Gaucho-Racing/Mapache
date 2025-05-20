import SignalWidget from "../SignalWidget";
import { formatTimeWithMillis } from "@/lib/utils";

interface MobileDebugWidgetProps {
  vehicle_id: string;
  start_time: string;
  end_time: string;
  current_millis: number;
  showDeltaBanner?: boolean;
}

export default function MobileDebugWidget({
  vehicle_id,
  start_time,
  end_time,
  current_millis,
  showDeltaBanner = false,
}: MobileDebugWidgetProps) {
  const signals = [
    "mobile_latitude",
    "mobile_longitude",
    "mobile_heading",
    "mobile_altitude",
    "mobile_speed",
    "mobile_battery",
    "mobile_accelerometer_x",
    "mobile_accelerometer_y",
    "mobile_accelerometer_z",
    "mobile_gyroscope_x",
    "mobile_gyroscope_y",
    "mobile_gyroscope_z",
    "mobile_magnetometer_x",
    "mobile_magnetometer_y",
    "mobile_magnetometer_z",
  ];

  return (
    <SignalWidget
      vehicle_id={vehicle_id}
      start_time={start_time}
      end_time={end_time}
      current_millis={current_millis}
      signals={signals}
      showDeltaBanner={showDeltaBanner}
      width={500}
      height={430}
    >
      {(_, currentSignals) => (
        <div className="h-full w-full p-4">
          <div className="mb-2 flex">
            <div className="pr-2 font-semibold">produced_at:</div>
            <div className="font-semibold text-gray-400">
              {new Date(currentSignals.produced_at).toLocaleDateString()}{" "}
              {formatTimeWithMillis(new Date(currentSignals.produced_at))}{" "}
            </div>
            <div className="ml-2 font-semibold">
              {(() => {
                const delta = Math.round(
                  new Date(currentSignals.produced_at).getTime() -
                    (new Date(start_time).getTime() + current_millis),
                );
                const textColor =
                  Math.abs(delta) < 500 ? "text-gray-400" : "text-yellow-500";
                return (
                  <p className={`${textColor}`}>
                    {delta > 0 ? "+" : ""}
                    {delta}ms
                  </p>
                );
              })()}
            </div>
          </div>
          {Object.entries(currentSignals).map(([key, value]) => {
            if (key !== "produced_at") {
              return (
                <div key={key} className="flex">
                  <div className="pr-2 font-semibold">{key}:</div>
                  <div className="font-semibold text-gray-400">
                    {String(value)}
                  </div>
                </div>
              );
            }
          })}
        </div>
      )}
    </SignalWidget>
  );
}

import SignalWidget from "../SignalWidget";
import { formatTimeWithMillis } from "@/lib/utils";

interface InverterDebugWidgetProps {
  vehicle_id: string;
  start_time: string;
  end_time: string;
  current_millis: number;
  showDeltaBanner?: boolean;
}

export default function InverterDebugWidget({
  vehicle_id,
  start_time,
  end_time,
  current_millis,
  showDeltaBanner = false,
}: InverterDebugWidgetProps) {
  const signals = [
    "inverter_current_ac",
    "inverter_current_dc",
    "inverter_digital_io",
    "inverter_drive_enable",
    "inverter_drv_error",
    "inverter_duty_cycle",
    "inverter_erpm",
    "inverter_faults",
    "inverter_flags_one",
    "inverter_flags_two",
    "inverter_fociq",
    "inverter_foc_id",
    "inverter_input_voltage",
    "inverter_motor_overtemp_error",
    "inverter_motor_temp",
    "inverter_overcurrent_error",
    "inverter_overvoltage_error",
    "inverter_sensor_general_error",
    "inverter_sensor_wire_error",
    "inverter_throttle",
    "inverter_undervoltage_error",
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
      height={570}
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

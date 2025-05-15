import SignalWidget from "../SignalWidget";
import { formatTimeWithMillis } from "@/lib/utils";

interface AcuDebugWidgetProps {
  vehicle_id: string;
  start_time: string;
  end_time: string;
  current_millis: number;
  showDeltaBanner?: boolean;
}

export default function AcuDebugWidget({
  vehicle_id,
  start_time,
  end_time,
  current_millis,
  showDeltaBanner = false,
}: AcuDebugWidgetProps) {
  const signals = [
    "acu_accumulator_current",
    "acu_accumulator_voltage",
    "acu_air_negative",
    "acu_air_positive",
    "acu_bms_error",
    "acu_max_bal_resistor_temp",
    "acu_max_cell_temp",
    "acu_over_current_error",
    "acu_over_temp_error",
    "acu_over_voltage_error",
    "acu_precharge_done",
    "acu_precharge_error",
    "acu_precharging",
    "acu_pump_speed",
    "acu_sdc_voltage",
    "acu_shutdown",
    "acu_state_of_charge",
    "acu_teensy_error",
    "acu_temp1",
    "acu_temp2",
    "acu_temp3",
    "acu_ts_voltage",
    "acu_under_temp_error",
    "acu_under_voltage_error",
    ...Array.from({ length: 17 }, (_, i) => `acu_cell${i * 8}_temp`),
    ...Array.from({ length: 17 }, (_, i) => `acu_cell${i * 8}_voltage`),
  ];

  return (
    <SignalWidget
      vehicle_id={vehicle_id}
      start_time={start_time}
      end_time={end_time}
      current_millis={current_millis}
      signals={signals}
      showDeltaBanner={showDeltaBanner}
      width={1100}
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
          <div className="grid grid-cols-4">
            {Object.entries(currentSignals).map(([key, value]) => {
              if (key !== "produced_at") {
                const formattedValue =
                  typeof value === "number"
                    ? Number(value.toFixed(2))
                    : String(value);
                return (
                  <div key={key} className="flex ">
                    <div className="pr-2 font-semibold">{key}:</div>
                    <div className="font-semibold text-gray-400">
                      {formattedValue}
                    </div>
                  </div>
                );
              }
            })}
          </div>
        </div>
      )}
    </SignalWidget>
  );
}

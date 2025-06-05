import SignalWidget from "../SignalWidget";
import { formatTimeWithMillis } from "@/lib/utils";

interface VdmDebugWidgetProps {
  vehicle_id: string;
  start_time: string;
  end_time: string;
  current_millis: number;
  showDeltaBanner?: boolean;
}

export default function VdmDebugWidget({
  vehicle_id,
  start_time,
  end_time,
  current_millis,
  showDeltaBanner = false,
}: VdmDebugWidgetProps) {
  const signals = [
    "vdm_ams_fault",
    "vdm_brake_f",
    "vdm_brake_r",
    "vdm_bspd_fault",
    "vdm_can_status",
    "vdm_imd_fault",
    "vdm_max_power",
    "vdm_mode",
    "vdm_motor_temp_limit",
    "vdm_motor_temp_warning",
    "vdm_rev_limit",
    "vdm_sdc_opened",
    "vdm_speed",
    "vdm_state",
    "vdm_system_status",
    "vdm_tcm_status",
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
      height={450}
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

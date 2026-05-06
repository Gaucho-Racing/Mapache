import LiveWidget from "@/components/widgets/LiveWidget";

interface DtiDebugWidgetProps {
  vehicle_id: string;
  showDeltaBanner?: boolean;
}

export default function DtiDebugWidget({
  vehicle_id,
  showDeltaBanner = false,
}: DtiDebugWidgetProps) {
  const signals = [
    "dti_erpm",
    "dti_duty_cycle",
    "dti_input_voltage",
    "dti_ac_current",
    "dti_dc_current",
    "dti_controller_temp",
    "dti_motor_temp",
    "dti_fault_codes",
    "dti_foc_id",
    "dti_foc_iq",
    "dti_throttle",
    "dti_brake",
    "dti_digital_io",
    "dti_drive_enable",
    "dti_limit_flags",
    "dti_can_version",
  ].sort();

  return (
    <LiveWidget
      vehicle_id={vehicle_id}
      signals={signals}
      showDeltaBanner={showDeltaBanner}
      alwaysShowData={true}
      width={1000}
      height={360}
    >
      {(_, currentSignals) => (
        <div className="h-full w-full p-4">
          <h1 className="mb-2 text-2xl font-bold">DTI Inverter Debug</h1>
          <div className="grid grid-cols-4 gap-2">
            {signals.map((signal) => (
              <div key={signal} className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">{signal}</span>
                  <span className="text-sm text-muted-foreground">
                    {currentSignals.get(signal)?.value ?? 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </LiveWidget>
  );
}

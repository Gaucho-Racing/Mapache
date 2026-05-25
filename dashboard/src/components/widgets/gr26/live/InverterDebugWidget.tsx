import LiveWidget from "@/components/widgets/LiveWidget";

interface InverterDebugWidgetProps {
  vehicle_id: string;
  showDeltaBanner?: boolean;
}

export default function InverterDebugWidget({
  vehicle_id,
  showDeltaBanner = false,
}: InverterDebugWidgetProps) {
  const signals = [
    "inverter_ac_current",
    "inverter_dc_current",
    "inverter_motor_rpm",
    "inverter_u_mosfet_temp",
    "inverter_v_mosfet_temp",
    "inverter_w_mosfet_temp",
    "inverter_motor_temp",
    "inverter_fault_bits",
    "inverter_max_ac_current",
    "inverter_max_dc_current",
    "inverter_absolute_max_rpm",
    "inverter_motor_direction",
    "inverter_set_ac_current",
    "inverter_set_dc_current",
    "inverter_rpm_limit",
    "inverter_field_weakening",
    "inverter_drive_enable",
  ].sort();

  return (
    <LiveWidget
      vehicle_id={vehicle_id}
      signals={signals}
      showDeltaBanner={showDeltaBanner}
      alwaysShowData={true}
      width={1000}
      height={250}
    >
      {(_, currentSignals) => (
        <div className="h-full w-full p-4">
          <h1 className="mb-2 text-2xl font-bold">GR Inverter Debug</h1>
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

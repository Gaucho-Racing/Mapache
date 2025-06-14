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
    "inverter_1_motor_rpm",
    "inverter_1_ac_current",
    "inverter_1_dc_current",
    "inverter_1_u_mosfet_temp",
    "inverter_1_v_mosfet_temp",
    "inverter_1_w_mosfet_temp",
    "inverter_1_overtemp_fault",
    "inverter_1_motor_overtemp_fault",
    "inverter_1_transistor_fault",
    "inverter_1_encoder_fault",
    "inverter_1_can_fault",
    "inverter_1_motor_temp",
    "inverter_1_over_voltage_faults",
    "inverter_1_under_voltage_fault",
    "inverter_2_motor_rpm",
    "inverter_2_ac_current",
    "inverter_2_dc_current",
    "inverter_2_u_mosfet_temp",
    "inverter_2_v_mosfet_temp",
    "inverter_2_w_mosfet_temp",
    "inverter_2_overtemp_fault",
    "inverter_2_motor_overtemp_fault",
    "inverter_2_transistor_fault",
    "inverter_2_encoder_fault",
    "inverter_2_can_fault",
    "inverter_2_motor_temp",
    "inverter_2_over_voltage_faults",
    "inverter_2_under_voltage_fault",
    "inverter_3_motor_rpm",
    "inverter_3_ac_current",
    "inverter_3_dc_current",
    "inverter_3_u_mosfet_temp",
    "inverter_3_v_mosfet_temp",
    "inverter_3_w_mosfet_temp",
    "inverter_3_overtemp_fault",
    "inverter_3_motor_overtemp_fault",
    "inverter_3_transistor_fault",
    "inverter_3_encoder_fault",
    "inverter_3_can_fault",
    "inverter_3_motor_temp",
    "inverter_3_over_voltage_faults",
    "inverter_3_under_voltage_fault",
    "inverter_4_motor_rpm",
    "inverter_4_ac_current",
    "inverter_4_dc_current",
    "inverter_4_u_mosfet_temp",
    "inverter_4_v_mosfet_temp",
    "inverter_4_w_mosfet_temp",
    "inverter_4_overtemp_fault",
    "inverter_4_motor_overtemp_fault",
    "inverter_4_transistor_fault",
    "inverter_4_encoder_fault",
    "inverter_4_can_fault",
    "inverter_4_motor_temp",
    "inverter_4_over_voltage_faults",
    "inverter_4_under_voltage_fault",
  ].sort();

  return (
    <LiveWidget
      vehicle_id={vehicle_id}
      signals={signals}
      showDeltaBanner={showDeltaBanner}
      alwaysShowData={true}
      width={1000}
      height={460}
    >
      {(_, currentSignals) => (
        <div className="h-full w-full p-4">
          <h1 className="mb-2 text-2xl font-bold">Inverter Debug</h1>
          <div className="grid grid-cols-4 gap-2">
            {signals.map((signal) => (
              <div key={signal} className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">{signal}</span>
                  <span className="text-sm text-muted-foreground">
                    {currentSignals.get(signal)?.value || 0}
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

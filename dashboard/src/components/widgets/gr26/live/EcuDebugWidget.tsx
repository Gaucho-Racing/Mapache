import LiveWidget from "@/components/widgets/LiveWidget";

interface EcuDebugWidgetProps {
  vehicle_id: string;
  showDeltaBanner?: boolean;
}

export default function EcuDebugWidget({
  vehicle_id,
  showDeltaBanner = false,
}: EcuDebugWidgetProps) {
  const signals = [
    "ecu_state",
    "ecu_ping_group_1",
    "ecu_ping_group_2",
    "ecu_ping_group_3",
    "ecu_power_level",
    "ecu_torque_map",
    "ecu_max_cell_temp",
    "ecu_accumulator_soc",
    "ecu_glv_soc",
    "ecu_ts_voltage",
    "ecu_vehicle_speed",
    "ecu_fl_wheel_rpm",
    "ecu_fr_wheel_rpm",
    "ecu_rl_wheel_rpm",
    "ecu_rr_wheel_rpm",
    "ecu_relay_states",
    "ecu_bspd_signal",
    "ecu_bse_signal",
    "ecu_apps1_signal",
    "ecu_apps2_signal",
    "ecu_brakeline_f_signal",
    "ecu_brakeline_r_signal",
    "ecu_steering_angle_signal",
    "ecu_aux_signal",
  ].sort();

  return (
    <LiveWidget
      vehicle_id={vehicle_id}
      signals={signals}
      showDeltaBanner={showDeltaBanner}
      alwaysShowData={true}
      width={1000}
      height={300}
    >
      {(_, currentSignals) => (
        <div className="h-full w-full p-4">
          <h1 className="mb-2 text-2xl font-bold">ECU Debug</h1>
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

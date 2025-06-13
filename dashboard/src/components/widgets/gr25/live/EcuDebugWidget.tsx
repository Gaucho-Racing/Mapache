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
    "ecu_power_level",
    "ecu_acu_state_of_charge",
    "ecu_fan_six_status",
    "ecu_max_cell_temp",
    "ecu_inv_three_status",
    "ecu_inv_two_status",
    "ecu_inv_four_status",
    "ecu_fan_four_status",
    "ecu_fan_seven_status",
    "ecu_glv_state_of_charge",
    "ecu_inv_one_status",
    "ecu_state",
    "ecu_fan_three_status",
    "ecu_steering_status",
    "ecu_acu_status",
    "ecu_fan_one_status",
    "ecu_fan_five_status",
    "ecu_fan_eight_status",
    "ecu_fan_two_status",
    "ecu_torque_map",
    "ecu_dash_status",
    "ecu_vehicle_speed",
    "ecu_fr_wheel_rpm",
    "ecu_fl_wheel_rpm",
    "ecu_tractive_system_voltage",
    "ecu_rr_wheel_rpm",
    "ecu_rl_wheel_rpm",
    "ecu_set_ts_active",
    "ecu_charge_voltage",
    "ecu_charge_current",
    "ecu_min_cell_voltage",
    "ecu_max_cell_temp",
    "ecu_max_ac_current",
    "ecu_max_dc_current",
    "ecu_absolute_max_rpm_limit",
    "ecu_motor_direction",
    "ecu_set_dc_current",
    "ecu_rpm_limit",
    "ecu_field_weakening",
    "ecu_drive_enable",
    "ecu_set_ac_current",
    "ecu_fan_command",
    "ecu_imd_led",
    "ecu_button_led_1_r",
    "ecu_button_led_2_b",
    "ecu_button_led_1_g",
    "ecu_button_led_1_b",
    "ecu_button_led_2_g",
    "ecu_bspd_led",
    "ecu_button_led_2_r",
    "ecu_bms_led",
    "ecu_bse_apps_violation",
    "ecu_apps_two",
    "ecu_brake_pressure",
    "ecu_brake_force",
    "ecu_apps_one",
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
          <h1 className="mb-2 text-2xl font-bold">ECU Debug</h1>
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

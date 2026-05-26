import LiveWidget from "@/components/widgets/LiveWidget";

interface BcuDebugWidgetProps {
  vehicle_id: string;
  showDeltaBanner?: boolean;
}

export default function BcuDebugWidget({
  vehicle_id,
  showDeltaBanner = false,
}: BcuDebugWidgetProps) {
  const signals = [
    "bcu_accumulator_voltage",
    "bcu_ts_voltage",
    "bcu_accumulator_current",
    "bcu_accumulator_soc",
    "bcu_glv_soc",
    "bcu_20v_voltage",
    "bcu_12v_voltage",
    "bcu_sdc_voltage",
    "bcu_min_cell_voltage",
    "bcu_max_cell_temp",
    "bcu_status_flags",
    "bcu_precharge_latch_flags",
    "bcu_hv_input_voltage",
    "bcu_hv_output_voltage",
    "bcu_hv_input_current",
    "bcu_hv_output_current",
    "bcu_set_ts_active",
    "bcu_charge_voltage",
    "bcu_charge_current",
  ].sort();

  return (
    <LiveWidget
      vehicle_id={vehicle_id}
      signals={signals}
      showDeltaBanner={showDeltaBanner}
      alwaysShowData={true}
      width={1000}
      height={260}
    >
      {(_, currentSignals) => (
        <div className="h-full w-full p-4">
          <h1 className="mb-2 text-2xl font-bold">BCU Debug</h1>
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

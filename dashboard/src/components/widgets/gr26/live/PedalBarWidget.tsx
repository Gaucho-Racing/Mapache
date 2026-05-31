import LiveWidget from "@/components/widgets/LiveWidget";
import { Progress } from "@/components/ui/progress";
import { Signal } from "@/models/signal";

interface PedalBarWidgetProps {
  vehicle_id: string;
  showDeltaBanner?: boolean;
}

export default function PedalBarWidget({
  vehicle_id,
  showDeltaBanner = false,
}: PedalBarWidgetProps) {
  const signals = ["ecu_acc_pedal", "ecu_brake_pedal"];

  return (
    <LiveWidget
      vehicle_id={vehicle_id}
      signals={signals}
      showDeltaBanner={showDeltaBanner}
      alwaysShowData={true}
      width={400}
      height={200}
    >
      {(_: Map<string, Signal[]>, currentSignals: Map<string, Signal>) => {
        const accPedal = currentSignals.get("ecu_acc_pedal")?.value ?? 0;
        const brakePedal = currentSignals.get("ecu_brake_pedal")?.value ?? 0;
        const accClamped = Math.min(100, Math.max(0, accPedal));
        const brakeClamped = Math.min(100, Math.max(0, brakePedal));

        return (
          <div className="h-full w-full p-4">
            <h1 className="mb-4 text-2xl font-bold">Pedals</h1>
            <div className="mb-3 flex items-center justify-center">
              <div className="w-1/3 text-start">
                <p>APPS:</p>
                <h3>{accPedal.toFixed(2)}%</h3>
              </div>
              <div className="w-2/3">
                <Progress value={accClamped} />
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="w-1/3 text-start">
                <p>Brake:</p>
                <h3>{brakePedal.toFixed(2)}%</h3>
              </div>
              <div className="w-2/3">
                <Progress value={brakeClamped} />
              </div>
            </div>
          </div>
        );
      }}
    </LiveWidget>
  );
}

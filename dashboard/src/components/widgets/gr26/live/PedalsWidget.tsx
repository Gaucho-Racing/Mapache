import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import LiveWidget from "@/components/widgets/LiveWidget";

interface PedalsWidgetProps {
  vehicle_id: string;
  showDeltaBanner?: boolean;
}

export default function PedalsWidget({
  vehicle_id,
  showDeltaBanner = false,
}: PedalsWidgetProps) {
  const signals = ["ecu_apps1_signal", "ecu_apps2_signal"];

  return (
    <LiveWidget
      vehicle_id={vehicle_id}
      signals={signals}
      showDeltaBanner={showDeltaBanner}
      alwaysShowData={true}
      width={400}
      height={300}
    >
      {(_, currentSignals) => {
        const apps1 = currentSignals.get("ecu_apps1_signal");
        const apps2 = currentSignals.get("ecu_apps2_signal");
        return (
          <div className="h-full w-full p-4">
            <h1 className="mb-2 text-2xl font-bold">Pedals</h1>
            <div className="flex items-center justify-center">
              <div className="w-1/3 text-start">
                <p>APPS 1:</p>
                <h3>{(apps1?.value ?? 0).toFixed(2)}</h3>
              </div>
              <div className="w-2/3">
                <Progress value={Math.floor(apps1?.value ?? 0)} />
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="w-1/3 text-start">
                <p>APPS 2:</p>
                <h3>{(apps2?.value ?? 0).toFixed(2)}</h3>
              </div>
              <div className="w-2/3">
                <Progress value={Math.floor(apps2?.value ?? 0)} />
              </div>
            </div>
            <Separator className="my-2" />
            <div className="flex items-center justify-between">
              <div className="w-1/2 text-start">
                <p>APPS 1 RAW:</p>
              </div>
              <h3>{apps1?.raw_value ?? 0}</h3>
            </div>
            <div className="flex items-center justify-between">
              <div className="w-1/2 text-start">
                <p>APPS 2 RAW:</p>
              </div>
              <h3>{apps2?.raw_value ?? 0}</h3>
            </div>
          </div>
        );
      }}
    </LiveWidget>
  );
}

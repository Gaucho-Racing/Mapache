import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import SignalWidget from "../SignalWidget";

interface PedalsWidgetProps {
  vehicle_id: string;
  start_time: string;
  end_time: string;
  current_millis: number;
  showDeltaBanner?: boolean;
}

export default function PedalsWidget({
  vehicle_id,
  start_time,
  end_time,
  current_millis,
  showDeltaBanner = false,
}: PedalsWidgetProps) {
  const signals = [
    "pedal_apps_one",
    "pedal_apps_two",
    "pedal_apps_one_raw",
    "pedal_apps_two_raw",
  ];

  return (
    <SignalWidget
      vehicle_id={vehicle_id}
      start_time={start_time}
      end_time={end_time}
      current_millis={current_millis}
      signals={signals}
      showDeltaBanner={showDeltaBanner}
    >
      {(_, currentSignals) => (
        <div className="h-full w-full p-4">
          <div className="flex items-center justify-center">
            <div className="w-1/3 text-start">
              <p>APPS 1:</p>
              <h3>
                {parseFloat(currentSignals.pedal_apps_one || 0).toFixed(2)}
              </h3>
            </div>
            <div className="w-2/3">
              <Progress
                value={Math.floor(currentSignals.pedal_apps_one || 0)}
              />
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="w-1/3 text-start">
              <p>APPS 2:</p>
              <h3>
                {parseFloat(currentSignals.pedal_apps_two || 0).toFixed(2)}
              </h3>
            </div>
            <div className="w-2/3">
              <Progress
                value={Math.floor(currentSignals.pedal_apps_two || 0)}
              />
            </div>
          </div>
          <Separator className="my-2" />
          <div className="flex items-center justify-between">
            <div className="w-1/2 text-start">
              <p>APPS 1 RAW:</p>
            </div>
            <h3>{currentSignals.pedal_apps_one_raw || 0}</h3>
          </div>
          <div className="flex items-center justify-between">
            <div className="w-1/2 text-start">
              <p>APPS 2 RAW:</p>
            </div>
            <h3>{currentSignals.pedal_apps_two_raw || 0}</h3>
          </div>
        </div>
      )}
    </SignalWidget>
  );
}

import LiveWidget from "@/components/widgets/LiveWidget";

interface PedalDebugWidgetProps {
  vehicle_id: string;
  showDeltaBanner?: boolean;
}

export default function PedalDebugWidget({
  vehicle_id,
  showDeltaBanner = false,
}: PedalDebugWidgetProps) {
  const signals = [""].sort();

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
          <h1 className="mb-2 text-2xl font-bold">Pedal Debug</h1>
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

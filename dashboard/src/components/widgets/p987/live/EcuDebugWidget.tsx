import LiveWidget from "@/components/widgets/LiveWidget";

interface EcuDebugWidgetProps {
  vehicle_id: string;
  showDeltaBanner?: boolean;
  title: string;
  signals: string[];
}

// Shared by every stock-CAN ECU on the 987. gr26 has one debug widget per
// node written out longhand; the 987 has seven ECUs decoded from the DBC,
// so they share this and pass their own signal list.
export default function EcuDebugWidget({
  vehicle_id,
  showDeltaBanner = false,
  title,
  signals,
}: EcuDebugWidgetProps) {
  const sorted = [...signals].sort();

  return (
    <LiveWidget
      vehicle_id={vehicle_id}
      signals={sorted}
      showDeltaBanner={showDeltaBanner}
      alwaysShowData={true}
      width={1000}
      height={300}
    >
      {(_, currentSignals) => (
        <div className="h-full w-full p-4">
          <h1 className="mb-2 text-2xl font-bold">{title}</h1>
          <div className="grid grid-cols-4 gap-2">
            {sorted.map((signal) => (
              <div key={signal} className="flex justify-between">
                <span className="text-sm font-medium">
                  {signal.replace(/^pcan_/, "")}
                </span>
                <span className="text-sm text-muted-foreground">
                  {currentSignals.get(signal)?.value ?? 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </LiveWidget>
  );
}

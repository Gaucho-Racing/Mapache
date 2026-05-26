import LiveWidget from "@/components/widgets/LiveWidget";

interface DgpsDebugWidgetProps {
  vehicle_id: string;
  showDeltaBanner?: boolean;
}

export default function DgpsDebugWidget({
  vehicle_id,
  showDeltaBanner = false,
}: DgpsDebugWidgetProps) {
  const signals = [
    "dgps_dgps_u",
    "dgps_dgps_v",
    "dgps_dgps_w",
    "dgps_status",
    "dgps_x_acc",
    "dgps_x_theta",
    "dgps_y_acc",
    "dgps_y_theta",
    "dgps_z_acc",
    "dgps_z_theta",
    "dgps_gps_latitude",
    "dgps_gps_longitude",
  ];

  return (
    <LiveWidget
      vehicle_id={vehicle_id}
      signals={signals}
      showDeltaBanner={showDeltaBanner}
      alwaysShowData={true}
      width={1000}
      height={200}
    >
      {(_, currentSignals) => (
        <div className="h-full w-full p-4">
          <h1 className="mb-2 text-2xl font-bold">DGPS Debug</h1>
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

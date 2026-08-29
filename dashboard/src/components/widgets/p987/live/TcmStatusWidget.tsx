import LiveWidget from "@/components/widgets/LiveWidget";

interface TcmStatusWidgetProps {
  vehicle_id: string;
  showDeltaBanner?: boolean;
}

// 0x200, published every 5s. Each connectivity bit is its own signal, so
// this is a straight read rather than any bit-twiddling.
export default function TcmStatusWidget({
  vehicle_id,
  showDeltaBanner = false,
}: TcmStatusWidgetProps) {
  const flags = [
    { signal: "tcm_connection_ok", label: "Internet" },
    { signal: "tcm_mqtt_ok", label: "Cloud broker" },
    { signal: "tcm_mapache_ok", label: "Mapache" },
    { signal: "tcm_clock_ok", label: "Clock synced" },
  ];
  const signals = [...flags.map((f) => f.signal), "tcm_mapache_ping"];

  return (
    <LiveWidget
      vehicle_id={vehicle_id}
      signals={signals}
      showDeltaBanner={showDeltaBanner}
      alwaysShowData={true}
      width={400}
      height={260}
    >
      {(_, currentSignals) => (
        <div className="h-full w-full p-4">
          <h1 className="mb-3 text-2xl font-bold">TCM Status</h1>
          <div className="space-y-2">
            {flags.map((f) => {
              const ok = (currentSignals.get(f.signal)?.value ?? 0) === 1;
              return (
                <div
                  key={f.signal}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm">{f.label}</span>
                  <span
                    className={`text-sm font-medium ${ok ? "text-green-500" : "text-red-500"}`}
                  >
                    {ok ? "up" : "down"}
                  </span>
                </div>
              );
            })}
            <div className="flex items-center justify-between border-t pt-2">
              <span className="text-sm">Round trip</span>
              <span className="text-sm text-muted-foreground">
                {(currentSignals.get("tcm_mapache_ping")?.value ?? 0).toFixed(
                  0,
                )}{" "}
                ms
              </span>
            </div>
          </div>
        </div>
      )}
    </LiveWidget>
  );
}

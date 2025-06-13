import LiveWidget from "@/components/widgets/LiveWidget";
import { Progress } from "@/components/ui/progress";

interface TcmCpuWidgetProps {
  vehicle_id: string;
  showDeltaBanner?: boolean;
}

export default function TcmCpuWidget({
  vehicle_id,
  showDeltaBanner = false,
}: TcmCpuWidgetProps) {
  const signals = [
    "tcm_cpu0_util",
    "tcm_cpu1_util",
    "tcm_cpu2_util",
    "tcm_cpu3_util",
    "tcm_cpu4_util",
    "tcm_cpu5_util",
    "tcm_cpu0_freq",
    "tcm_cpu1_freq",
    "tcm_cpu2_freq",
    "tcm_cpu3_freq",
    "tcm_cpu4_freq",
    "tcm_cpu5_freq",
  ];

  const getUtilizationColor = (value: number) => {
    if (value < 50) return "bg-green-500";
    if (value < 80) return "bg-yellow-500";
    return "bg-red-500";
  };

  const formatValue = (key: string, value: number) => {
    if (key.includes("freq")) return `${(value / 1000).toFixed(1)} GHz`;
    if (key.includes("util")) return `${value.toFixed(1)}%`;
    if (key.includes("temp")) return `${value.toFixed(1)}°C`;
    if (key.includes("ram") || key.includes("disk"))
      return `${(value / 1024).toFixed(2)} MB`;
    if (key.includes("power")) return `${value.toFixed(1)} W`;
    if (key.includes("current")) return `${value.toFixed(1)} A`;
    if (key.includes("voltage")) return `${value.toFixed(1)} V`;
    return value.toFixed(1);
  };

  return (
    <LiveWidget
      vehicle_id={vehicle_id}
      signals={signals}
      showDeltaBanner={showDeltaBanner}
      alwaysShowData={true}
      width={700}
      height={320}
    >
      {(_, currentSignals) => (
        <div className="h-full w-full p-4">
          <h1 className="mb-2 text-2xl font-bold">TCM CPU Cores</h1>
          <div className="grid grid-cols-2 gap-4">
            {[0, 1, 2, 3, 4, 5].map((core) => (
              <div key={core} className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Core {core}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatValue(
                      "tcm_cpu0_freq",
                      currentSignals.get(`tcm_cpu${core}_freq`)?.value || 0,
                    )}
                  </span>
                </div>
                <Progress
                  value={currentSignals.get(`tcm_cpu${core}_util`)?.value || 0}
                  indicatorClassName={getUtilizationColor(
                    currentSignals.get(`tcm_cpu${core}_util`)?.value || 0,
                  )}
                />
                <div className="text-right text-sm">
                  {formatValue(
                    "tcm_cpu0_util",
                    currentSignals.get(`tcm_cpu${core}_util`)?.value || 0,
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </LiveWidget>
  );
}

import LiveWidget from "@/components/widgets/LiveWidget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Cpu, HardDrive, MemoryStick, Thermometer } from "lucide-react";

interface TcmResourceWidgetProps {
  vehicle_id: string;
  showDeltaBanner?: boolean;
}

// The 987's TCM is a Pi Zero 2 W, so this is deliberately not the gr25
// layout: four cores instead of six, and no GPU or power-rail readings
// because the board has no sensors for them. The throttle flags take their
// place — under-voltage is the failure mode this hardware actually has,
// and it shows up in none of the other metrics.
export default function TcmResourceWidget({
  vehicle_id,
  showDeltaBanner = false,
}: TcmResourceWidgetProps) {
  const cores = [0, 1, 2, 3];
  const signals = [
    "tcm_cpu_total_util",
    ...cores.map((n) => `tcm_cpu_${n}_util`),
    ...cores.map((n) => `tcm_cpu_${n}_freq`),
    "tcm_cpu_temp",
    "tcm_ram_total",
    "tcm_ram_used",
    "tcm_ram_util",
    "tcm_disk_total",
    "tcm_disk_used",
    "tcm_disk_util",
    "tcm_undervoltage",
    "tcm_undervoltage_since_boot",
    "tcm_thermal_throttled",
    "tcm_thermal_throttled_since_boot",
  ];

  const utilizationColor = (value: number) => {
    if (value < 50) return "bg-green-500";
    if (value < 80) return "bg-yellow-500";
    return "bg-red-500";
  };

  const tempColor = (value: number) => {
    // The Pi soft-throttles at 80C and hard-throttles at 85C.
    if (value < 60) return "text-green-500";
    if (value < 80) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <LiveWidget
      vehicle_id={vehicle_id}
      signals={signals}
      showDeltaBanner={showDeltaBanner}
      alwaysShowData={true}
      width={700}
      height={500}
    >
      {(_, currentSignals) => {
        const value = (name: string) => currentSignals.get(name)?.value ?? 0;
        const flag = (name: string) => value(name) === 1;

        return (
          <div className="h-full w-full p-4">
            <h1 className="mb-2 text-2xl font-bold">TCM Resources</h1>
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    CPU Utilization
                  </CardTitle>
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="pb-2 text-2xl font-bold">
                    {value("tcm_cpu_total_util").toFixed(0)}%
                  </div>
                  <Progress
                    value={value("tcm_cpu_total_util")}
                    indicatorClassName={utilizationColor(
                      value("tcm_cpu_total_util"),
                    )}
                  />
                  <div className="mt-3 grid grid-cols-2 gap-1">
                    {cores.map((n) => (
                      <div
                        key={n}
                        className="flex justify-between text-xs text-muted-foreground"
                      >
                        <span>core {n}</span>
                        <span>
                          {value(`tcm_cpu_${n}_util`).toFixed(0)}% ·{" "}
                          {value(`tcm_cpu_${n}_freq`).toFixed(0)} MHz
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Memory</CardTitle>
                  <MemoryStick className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="pb-2 text-2xl font-bold">
                    {value("tcm_ram_util").toFixed(0)}%
                  </div>
                  <Progress
                    value={value("tcm_ram_util")}
                    indicatorClassName={utilizationColor(value("tcm_ram_util"))}
                  />
                  <div className="mt-3 text-xs text-muted-foreground">
                    {value("tcm_ram_used").toFixed(0)} /{" "}
                    {value("tcm_ram_total").toFixed(0)} MB
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Disk</CardTitle>
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="pb-2 text-2xl font-bold">
                    {value("tcm_disk_util").toFixed(0)}%
                  </div>
                  <Progress
                    value={value("tcm_disk_util")}
                    indicatorClassName={utilizationColor(
                      value("tcm_disk_util"),
                    )}
                  />
                  <div className="mt-3 text-xs text-muted-foreground">
                    {value("tcm_disk_used").toFixed(0)} /{" "}
                    {value("tcm_disk_total").toFixed(0)} MB
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Temperature & Throttling
                  </CardTitle>
                  <Thermometer className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div
                    className={`pb-2 text-2xl font-bold ${tempColor(value("tcm_cpu_temp"))}`}
                  >
                    {value("tcm_cpu_temp").toFixed(0)}°C
                  </div>
                  <div className="space-y-1 text-xs">
                    <ThrottleRow
                      label="Under-voltage"
                      now={flag("tcm_undervoltage")}
                      sinceBoot={flag("tcm_undervoltage_since_boot")}
                    />
                    <ThrottleRow
                      label="Thermal throttle"
                      now={flag("tcm_thermal_throttled")}
                      sinceBoot={flag("tcm_thermal_throttled_since_boot")}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      }}
    </LiveWidget>
  );
}

// A since-boot flag that is set while the live flag is clear means the
// event happened earlier in this power cycle — worth surfacing separately
// rather than collapsing both into one indicator.
function ThrottleRow({
  label,
  now,
  sinceBoot,
}: {
  label: string;
  now: boolean;
  sinceBoot: boolean;
}) {
  const color = now
    ? "text-red-500"
    : sinceBoot
      ? "text-yellow-500"
      : "text-muted-foreground";
  const state = now ? "active" : sinceBoot ? "seen since boot" : "clear";
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={color}>{state}</span>
    </div>
  );
}

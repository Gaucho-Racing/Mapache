import LiveWidget from "@/components/widgets/LiveWidget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Monitor,
  Thermometer,
  BatteryCharging,
} from "lucide-react";

interface TcmResourceOverviewWidgetProps {
  vehicle_id: string;
  showDeltaBanner?: boolean;
}

export default function TcmResourceOverviewWidget({
  vehicle_id,
  showDeltaBanner = false,
}: TcmResourceOverviewWidgetProps) {
  const signals = [
    // CPU signals
    "tcm_cpu_total_util",
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
    "tcm_cpu_temp",

    // Memory signals
    "tcm_ram_total",
    "tcm_ram_used",
    "tcm_ram_util",

    // Storage signals
    "tcm_disk_total",
    "tcm_disk_used",
    "tcm_disk_util",

    // GPU signals
    "tcm_gpu_util",
    "tcm_gpu_temp",
    "tcm_gpu_freq",

    // Power signals
    "tcm_power_draw",
    "tcm_current_draw",
    "tcm_voltage_draw",
  ];

  const getUtilizationColor = (value: number) => {
    if (value < 50) return "bg-green-500";
    if (value < 80) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getTempColor = (value: number) => {
    if (value < 60) return "text-green-500";
    if (value < 80) return "text-yellow-500";
    return "text-red-500";
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
      height={500}
    >
      {(_, currentSignals) => (
        <div className="h-full w-full p-4">
          <h1 className="mb-2 text-2xl font-bold">TCM Resource Utilization</h1>
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
                  {formatValue(
                    "tcm_cpu_total_util",
                    currentSignals.get("tcm_cpu_total_util")?.value || 0,
                  )}
                </div>
                <Progress
                  value={currentSignals.get("tcm_cpu_total_util")?.value || 0}
                  indicatorClassName={getUtilizationColor(
                    currentSignals.get("tcm_cpu_total_util")?.value || 0,
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Memory Usage
                </CardTitle>
                <MemoryStick className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="pb-2 text-2xl font-bold">
                  {formatValue(
                    "tcm_ram_util",
                    currentSignals.get("tcm_ram_util")?.value || 0,
                  )}
                </div>
                <Progress
                  value={currentSignals.get("tcm_ram_util")?.value || 0}
                  indicatorClassName={getUtilizationColor(
                    currentSignals.get("tcm_ram_util")?.value || 0,
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  GPU Utilization
                </CardTitle>
                <Monitor className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="pb-2 text-2xl font-bold">
                  {formatValue(
                    "tcm_gpu_util",
                    currentSignals.get("tcm_gpu_util")?.value || 0,
                  )}
                </div>
                <Progress
                  value={currentSignals.get("tcm_gpu_util")?.value || 0}
                  indicatorClassName={getUtilizationColor(
                    currentSignals.get("tcm_gpu_util")?.value || 0,
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Storage Usage
                </CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="pb-2 text-2xl font-bold">
                  {formatValue(
                    "tcm_disk_util",
                    currentSignals.get("tcm_disk_util")?.value || 0,
                  )}
                </div>
                <Progress
                  value={currentSignals.get("tcm_disk_util")?.value || 0}
                  indicatorClassName={getUtilizationColor(
                    currentSignals.get("tcm_disk_util")?.value || 0,
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  System Temperatures
                </CardTitle>
                <Thermometer className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">CPU</div>
                    <div
                      className={getTempColor(
                        currentSignals.get("tcm_cpu_temp")?.value || 0,
                      )}
                    >
                      {formatValue(
                        "tcm_cpu_temp",
                        currentSignals.get("tcm_cpu_temp")?.value || 0,
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">GPU</div>
                    <div
                      className={getTempColor(
                        currentSignals.get("tcm_gpu_temp")?.value || 0,
                      )}
                    >
                      {formatValue(
                        "tcm_gpu_temp",
                        currentSignals.get("tcm_gpu_temp")?.value || 0,
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Power Information
                </CardTitle>
                <BatteryCharging className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Power Draw
                    </div>
                    <div className="text-lg font-semibold">
                      {formatValue(
                        "tcm_power_draw",
                        currentSignals.get("tcm_power_draw")?.value || 0,
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Current</div>
                    <div className="text-lg font-semibold">
                      {formatValue(
                        "tcm_current_draw",
                        currentSignals.get("tcm_current_draw")?.value || 0,
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Voltage</div>
                    <div className="text-lg font-semibold">
                      {formatValue(
                        "tcm_voltage_draw",
                        currentSignals.get("tcm_voltage_draw")?.value || 0,
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* <TabsContent value="cpu" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>CPU Cores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {[0, 1, 2, 3, 4, 5].map((core) => (
                    <div key={core} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Core {core}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatValue(
                            "tcm_cpu0_freq",
                            currentSignals.get(`tcm_cpu${core}_freq`)?.value ||
                              0,
                          )}
                        </span>
                      </div>
                      <Progress
                        value={
                          currentSignals.get(`tcm_cpu${core}_util`)?.value || 0
                        }
                        className={getUtilizationColor(
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="memory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Memory Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="mb-2 flex justify-between">
                      <span className="text-sm font-medium">Total Memory</span>
                      <span className="text-sm text-muted-foreground">
                        {formatValue(
                          "tcm_ram_total",
                          currentSignals.get("tcm_ram_total")?.value || 0,
                        )}
                      </span>
                    </div>
                    <Progress
                      value={currentSignals.get("tcm_ram_util")?.value || 0}
                      className={getUtilizationColor(
                        currentSignals.get("tcm_ram_util")?.value || 0,
                      )}
                    />
                    <div className="mt-2 flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Used
                      </span>
                      <span className="text-sm font-medium">
                        {formatValue(
                          "tcm_ram_used",
                          currentSignals.get("tcm_ram_used")?.value || 0,
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent> */}
          {/* 
          <TabsContent value="storage" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Storage Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="mb-2 flex justify-between">
                      <span className="text-sm font-medium">Total Storage</span>
                      <span className="text-sm text-muted-foreground">
                        {formatValue(
                          "tcm_disk_total",
                          currentSignals.get("tcm_disk_total")?.value || 0,
                        )}
                      </span>
                    </div>
                    <Progress
                      value={currentSignals.get("tcm_disk_util")?.value || 0}
                      className={getUtilizationColor(
                        currentSignals.get("tcm_disk_util")?.value || 0,
                      )}
                    />
                    <div className="mt-2 flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Used
                      </span>
                      <span className="text-sm font-medium">
                        {formatValue(
                          "tcm_disk_used",
                          currentSignals.get("tcm_disk_used")?.value || 0,
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent> */}

          {/* <TabsContent value="gpu" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>GPU Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="mb-2 flex justify-between">
                      <span className="text-sm font-medium">Utilization</span>
                      <span className="text-sm text-muted-foreground">
                        {formatValue(
                          "tcm_gpu_util",
                          currentSignals.get("tcm_gpu_util")?.value || 0,
                        )}
                      </span>
                    </div>
                    <Progress
                      value={currentSignals.get("tcm_gpu_util")?.value || 0}
                      className={getUtilizationColor(
                        currentSignals.get("tcm_gpu_util")?.value || 0,
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Temperature
                      </div>
                      <div
                        className={getTempColor(
                          currentSignals.get("tcm_gpu_temp")?.value || 0,
                        )}
                      >
                        {formatValue(
                          "tcm_gpu_temp",
                          currentSignals.get("tcm_gpu_temp")?.value || 0,
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Frequency
                      </div>
                      <div className="text-lg font-semibold">
                        {formatValue(
                          "tcm_gpu_freq",
                          currentSignals.get("tcm_gpu_freq")?.value || 0,
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent> */}

          {/* <TabsContent value="power" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Power Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Power Draw
                    </div>
                    <div className="text-lg font-semibold">
                      {formatValue(
                        "tcm_power_draw",
                        currentSignals.get("tcm_power_draw")?.value || 0,
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Current</div>
                    <div className="text-lg font-semibold">
                      {formatValue(
                        "tcm_current_draw",
                        currentSignals.get("tcm_current_draw")?.value || 0,
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Voltage</div>
                    <div className="text-lg font-semibold">
                      {formatValue(
                        "tcm_voltage_draw",
                        currentSignals.get("tcm_voltage_draw")?.value || 0,
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent> */}
        </div>
      )}
    </LiveWidget>
  );
}

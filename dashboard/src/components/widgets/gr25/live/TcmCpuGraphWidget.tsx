import LiveWidget from "@/components/widgets/LiveWidget";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { GR_COLORS } from "@/consts/config";

interface TcmCpuGraphWidgetProps {
  vehicle_id: string;
  showDeltaBanner?: boolean;
}

export default function TcmCpuGraphWidget({
  vehicle_id,
  showDeltaBanner = false,
}: TcmCpuGraphWidgetProps) {
  const signals = [
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
  ];

  const CHART_COLORS = [
    GR_COLORS.PINK,
    GR_COLORS.PURPLE,
    "#00FFFF", // Electric Blue
    "#00FF00", // Lime Green
    "#FF4500", // Orange Red
    "#FFD700", // Gold Yellow
    "#00BFFF", // Sky Blue
    "#FF69B4", // Hot Pink
    "#20FFD7", // Bright Teal
    "#C0C0C0", // Light Gray
  ] as const;

  return (
    <LiveWidget
      vehicle_id={vehicle_id}
      signals={signals}
      dataLength={40}
      showDeltaBanner={showDeltaBanner}
      alwaysShowData={true}
      width={700}
      height={430}
    >
      {(data) => {
        // Collect all unique timestamps across all signals
        const allTimestamps = new Set<number>();
        data.forEach((signalArray) => {
          signalArray.forEach((point) => {
            allTimestamps.add(new Date(point.produced_at).getTime());
          });
        });

        // Convert to array and sort
        const sortedTimestamps = Array.from(allTimestamps).sort(
          (a, b) => a - b,
        );

        // Process data for the chart
        const chartData = sortedTimestamps.map((timestamp) => {
          const time = new Date(timestamp).toLocaleString();
          const dataPoint: Record<string, number | string> = {
            time,
            timestamp,
          };

          // Add total CPU utilization
          const totalSignal = data.get("tcm_cpu_total_util");
          if (totalSignal) {
            const closestPoint = totalSignal.reduce((closest, current) => {
              const currentTime = new Date(current.produced_at).getTime();
              const closestTime = new Date(closest.produced_at).getTime();
              return Math.abs(currentTime - timestamp) <
                Math.abs(closestTime - timestamp)
                ? current
                : closest;
            });
            dataPoint["Total CPU"] = closestPoint?.value || 0;
          }

          // Add individual core data
          for (let i = 0; i < 6; i++) {
            const signalName = `tcm_cpu${i}_util`;
            const signalArray = data.get(signalName);
            if (signalArray) {
              const closestPoint = signalArray.reduce((closest, current) => {
                const currentTime = new Date(current.produced_at).getTime();
                const closestTime = new Date(closest.produced_at).getTime();
                return Math.abs(currentTime - timestamp) <
                  Math.abs(closestTime - timestamp)
                  ? current
                  : closest;
              });
              dataPoint[`Core ${i}`] = closestPoint?.value || 0;
            }
          }

          return dataPoint;
        });

        return (
          <div className="h-full w-full p-4">
            <h1 className="mb-2 text-2xl font-bold">TCM CPU Utilization</h1>
            <div className="h-[calc(100%-3rem)]">
              <ChartContainer
                config={{
                  time: { label: "Time" },
                  "Total CPU": { color: GR_COLORS.PINK, label: "Total CPU" },
                  ...Object.fromEntries(
                    Array.from({ length: 6 }, (_, i) => [
                      `Core ${i}`,
                      {
                        color: CHART_COLORS[(i + 1) % CHART_COLORS.length],
                        label: `Core ${i}`,
                      },
                    ]),
                  ),
                }}
              >
                <LineChart
                  data={chartData}
                  margin={{
                    top: 10,
                    right: 30,
                    left: 20,
                    bottom: 20,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="time"
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleTimeString();
                    }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                    width={40}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(value) =>
                          new Date(value).toLocaleString()
                        }
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line
                    type="monotone"
                    dataKey="Total CPU"
                    name="Total CPU"
                    stroke={GR_COLORS.PINK}
                    strokeWidth={3}
                    animateNewValues={false}
                    isAnimationActive={false}
                    dot={false}
                  />
                  {Array.from({ length: 6 }, (_, i) => (
                    <Line
                      key={i}
                      type="monotone"
                      dataKey={`Core ${i}`}
                      name={`Core ${i}`}
                      stroke={CHART_COLORS[(i + 1) % CHART_COLORS.length]}
                      strokeWidth={2}
                      animateNewValues={false}
                      isAnimationActive={false}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ChartContainer>
            </div>
          </div>
        );
      }}
    </LiveWidget>
  );
}

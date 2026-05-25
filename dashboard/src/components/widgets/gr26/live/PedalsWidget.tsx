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
import { Signal } from "@/models/signal";

interface PedalsWidgetProps {
  vehicle_id: string;
  showDeltaBanner?: boolean;
}

const APPS1_COLOR = GR_COLORS.PINK;
const APPS2_COLOR = GR_COLORS.PURPLE;

export default function PedalsWidget({
  vehicle_id,
  showDeltaBanner = false,
}: PedalsWidgetProps) {
  const signals = ["ecu_apps1_signal", "ecu_apps2_signal"];

  return (
    <LiveWidget
      vehicle_id={vehicle_id}
      signals={signals}
      dataLength={100}
      showDeltaBanner={showDeltaBanner}
      alwaysShowData={true}
      width={600}
      height={350}
    >
      {(data: Map<string, Signal[]>) => {
        const now = Date.now();
        const TEN_SECONDS_MS = 10_000;
        const cutoff = now - TEN_SECONDS_MS;

        // Collect all timestamps from both signals, filtered to last 10 seconds
        const allTimestamps = new Set<number>();
        const apps1Data = data.get("ecu_apps1_signal") || [];
        const apps2Data = data.get("ecu_apps2_signal") || [];

        apps1Data.forEach((point) => {
          const t = new Date(point.produced_at).getTime();
          if (t >= cutoff) allTimestamps.add(t);
        });
        apps2Data.forEach((point) => {
          const t = new Date(point.produced_at).getTime();
          if (t >= cutoff) allTimestamps.add(t);
        });

        const sortedTimestamps = Array.from(allTimestamps).sort(
          (a, b) => a - b,
        );

        // Use the most recent timestamp as "now" (0s reference)
        const nowRef =
          sortedTimestamps.length > 0
            ? sortedTimestamps[sortedTimestamps.length - 1]
            : Date.now();

        // Build chart data points with relative time (seconds before now)
        const chartData = sortedTimestamps.map((timestamp) => {
          const dataPoint: Record<string, number | string> = {
            time: (timestamp - nowRef) / 1000,
          };

          const findClosest = (signalArray: Signal[]) => {
            if (signalArray.length === 0) return 0;
            return signalArray.reduce((closest, current) => {
              const currentTime = new Date(current.produced_at).getTime();
              const closestTime = new Date(closest.produced_at).getTime();
              return Math.abs(currentTime - timestamp) <
                Math.abs(closestTime - timestamp)
                ? current
                : closest;
            }).raw_value;
          };

          dataPoint["APPS 1"] = findClosest(apps1Data);
          dataPoint["APPS 2"] = findClosest(apps2Data);

          return dataPoint;
        });

        return (
          <div className="h-full w-full p-4">
            <h1 className="mb-2 text-2xl font-bold">Pedals</h1>
            <div className="h-[calc(100%-3rem)]">
              <ChartContainer
                className="!aspect-auto h-full w-full"
                config={{
                  time: { label: "Time" },
                  "APPS 1": {
                    color: APPS1_COLOR,
                    label: "APPS 1",
                  },
                  "APPS 2": {
                    color: APPS2_COLOR,
                    label: "APPS 2",
                  },
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
                    tickFormatter={(value) => `${value.toFixed(1)}s`}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    domain={[-10, 0]}
                    type="number"
                    ticks={[-10, -8, -6, -4, -2, 0]}
                  />
                  <YAxis
                    domain={[0, 4096]}
                    tickFormatter={(value) => `${value}`}
                    width={50}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(value: unknown) => {
                          if (typeof value === "number") {
                            return `${value.toFixed(1)}s`;
                          }
                          return String(value);
                        }}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line
                    type="monotone"
                    dataKey="APPS 1"
                    name="APPS 1"
                    stroke={APPS1_COLOR}
                    strokeWidth={2}
                    animateNewValues={false}
                    isAnimationActive={false}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="APPS 2"
                    name="APPS 2"
                    stroke={APPS2_COLOR}
                    strokeWidth={2}
                    animateNewValues={false}
                    isAnimationActive={false}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </div>
          </div>
        );
      }}
    </LiveWidget>
  );
}

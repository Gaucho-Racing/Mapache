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

interface WheelSpeedGraphWidgetProps {
  vehicle_id: string;
  showDeltaBanner?: boolean;
}

const WHEEL_SPEED_COLOR = GR_COLORS.PINK;

// Conversion factor from dti_erpm to wheel speed.
// ERPM → mechanical RPM (÷ pole pairs) → wheel RPM (÷ gear ratio) → speed (× wheel circumference)
const ERPM_TO_WHEEL_SPEED = 0.00121429;

export default function WheelSpeedGraphWidget({
  vehicle_id,
  showDeltaBanner = false,
}: WheelSpeedGraphWidgetProps) {
  const signals = ["dti_erpm"];

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

        const erpmData = data.get("dti_erpm") || [];

        const allTimestamps = new Set<number>();
        erpmData.forEach((point) => {
          const t = new Date(point.produced_at).getTime();
          if (t >= cutoff) allTimestamps.add(t);
        });

        const sortedTimestamps = Array.from(allTimestamps).sort(
          (a, b) => a - b,
        );

        const nowRef =
          sortedTimestamps.length > 0
            ? sortedTimestamps[sortedTimestamps.length - 1]
            : Date.now();

        const chartData = sortedTimestamps.map((timestamp) => {
          const findClosest = (signalArray: Signal[]) => {
            if (signalArray.length === 0) return 0;
            return signalArray.reduce((closest, current) => {
              const currentTime = new Date(current.produced_at).getTime();
              const closestTime = new Date(closest.produced_at).getTime();
              return Math.abs(currentTime - timestamp) <
                Math.abs(closestTime - timestamp)
                ? current
                : closest;
            }).value;
          };

          const erpm = findClosest(erpmData);
          const wheelSpeed = erpm * ERPM_TO_WHEEL_SPEED * 10;

          return {
            time: (timestamp - nowRef) / 1000,
            "Wheel Speed": wheelSpeed,
          };
        });

        // Dynamically scale the Y-axis based on data
        const allSpeeds = chartData.map((d) => d["Wheel Speed"] as number);
        const maxSpeed = Math.max(Math.max(...allSpeeds, 0) * 1.15, 5);
        const yDomain = [0, maxSpeed];

        return (
          <div className="h-full w-full p-4">
            <h1 className="mb-2 text-2xl font-bold">Wheel Speed</h1>
            <div className="h-[calc(100%-3rem)]">
              <ChartContainer
                className="!aspect-auto h-full w-full"
                config={{
                  time: { label: "Time" },
                  "Wheel Speed": {
                    color: WHEEL_SPEED_COLOR,
                    label: "Wheel Speed",
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
                    domain={yDomain}
                    tickFormatter={(value) => `${value.toFixed(1)}`}
                    width={50}
                    label={{
                      value: "Speed",
                      angle: -90,
                      position: "insideLeft",
                      style: { fontSize: 12 },
                    }}
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
                        formatter={(value: number, name: string) => {
                          return [`${value.toFixed(2)}`, name];
                        }}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line
                    type="monotone"
                    dataKey="Wheel Speed"
                    name="Wheel Speed"
                    stroke={WHEEL_SPEED_COLOR}
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

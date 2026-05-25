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

interface DgpsVelocityWidgetProps {
  vehicle_id: string;
  showDeltaBanner?: boolean;
}

const U_COLOR = GR_COLORS.PINK;
const V_COLOR = GR_COLORS.PURPLE;
const W_COLOR = "#22d3ee";

export default function DgpsVelocityWidget({
  vehicle_id,
  showDeltaBanner = false,
}: DgpsVelocityWidgetProps) {
  const signals = ["dgps_dgps_u", "dgps_dgps_v", "dgps_dgps_w"];

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

        const uData = data.get("dgps_dgps_u") || [];
        const vData = data.get("dgps_dgps_v") || [];
        const wData = data.get("dgps_dgps_w") || [];

        const allTimestamps = new Set<number>();
        const addTimes = (arr: Signal[]) =>
          arr.forEach((p) => {
            const t = new Date(p.produced_at).getTime();
            if (t >= cutoff) allTimestamps.add(t);
          });
        addTimes(uData);
        addTimes(vData);
        addTimes(wData);

        const sortedTimestamps = Array.from(allTimestamps).sort(
          (a, b) => a - b,
        );

        const nowRef =
          sortedTimestamps.length > 0
            ? sortedTimestamps[sortedTimestamps.length - 1]
            : Date.now();

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
            }).value;
          };

          dataPoint["U"] = findClosest(uData);
          dataPoint["V"] = findClosest(vData);
          dataPoint["W"] = findClosest(wData);

          return dataPoint;
        });

        const allValues = chartData.flatMap((d) => [
          d.U as number,
          d.V as number,
          d.W as number,
        ]);
        const maxAbs = Math.max(Math.max(...allValues.map(Math.abs)), 5);
        const yDomain = [-maxAbs * 1.15, maxAbs * 1.15];

        return (
          <div className="h-full w-full p-4">
            <h1 className="mb-2 text-2xl font-bold">DGPS Velocity</h1>
            <div className="h-[calc(100%-3rem)]">
              <ChartContainer
                className="!aspect-auto h-full w-full"
                config={{
                  time: { label: "Time" },
                  U: { color: U_COLOR, label: "U" },
                  V: { color: V_COLOR, label: "V" },
                  W: { color: W_COLOR, label: "W" },
                }}
              >
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 20, bottom: 20 }}
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
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(value: unknown) => {
                          if (typeof value === "number")
                            return `${value.toFixed(1)}s`;
                          return String(value);
                        }}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line
                    type="monotone"
                    dataKey="U"
                    stroke={U_COLOR}
                    strokeWidth={2}
                    animateNewValues={false}
                    isAnimationActive={false}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="V"
                    stroke={V_COLOR}
                    strokeWidth={2}
                    animateNewValues={false}
                    isAnimationActive={false}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="W"
                    stroke={W_COLOR}
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

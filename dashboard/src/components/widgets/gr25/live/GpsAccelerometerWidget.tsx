import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { GR_COLORS, BACKEND_WS_URL } from "@/consts/config";
import { useVehicleList } from "@/lib/store";
import { Signal } from "@/models/signal";

interface GpsAccelerometerWidgetProps {
  vehicle_id: string;
  width?: number;
  height?: number;
}

interface ChartPoint {
  t: number;
  X: number | null;
  Y: number | null;
  Z: number | null;
}

// Per-signal rolling buffer stored in a ref — never triggers renders
interface SignalBuffers {
  gps_x_acc: { t: number; v: number }[];
  gps_y_acc: { t: number; v: number }[];
  gps_z_acc: { t: number; v: number }[];
}

const SIGNALS = ["gps_x_acc", "gps_y_acc", "gps_z_acc"] as const;
type SignalName = (typeof SIGNALS)[number];

const AXIS_KEY: Record<SignalName, "X" | "Y" | "Z"> = {
  gps_x_acc: "X",
  gps_y_acc: "Y",
  gps_z_acc: "Z",
};

const AXIS_COLOR: Record<SignalName, string> = {
  gps_x_acc: GR_COLORS.PINK,
  gps_y_acc: GR_COLORS.PURPLE,
  gps_z_acc: "#00FFFF",
};

const WINDOW_MS = 2000;
const FLUSH_MS = 100; // 10 fps

function nearestValue(
  buf: { t: number; v: number }[],
  target: number,
  toleranceMs = 200,
): number | null {
  if (buf.length === 0) return null;
  let best = buf[0];
  for (const p of buf) {
    if (Math.abs(p.t - target) < Math.abs(best.t - target)) best = p;
  }
  return Math.abs(best.t - target) <= toleranceMs ? best.v : null;
}

export default function GpsAccelerometerWidget({
  vehicle_id,
  width = 700,
  height = 430,
}: GpsAccelerometerWidgetProps) {
  const vehicleList = useVehicleList();

  const signalBuffers = useRef<SignalBuffers>({
    gps_x_acc: [],
    gps_y_acc: [],
    gps_z_acc: [],
  });

  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [current, setCurrent] = useState<Partial<Record<SignalName, number>>>(
    {},
  );
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const vehicle = vehicleList.find((v) => v.id === vehicle_id);
    if (!vehicle) return;

    const params = new URLSearchParams();
    params.append("signals", SIGNALS.join(","));
    params.append("vehicle_id", vehicle_id);
    const url = `${BACKEND_WS_URL}/${vehicle.type}/live?${params.toString()}`;

    let ws: WebSocket;
    let flushInterval: ReturnType<typeof setInterval>;
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let destroyed = false;

    const connect = () => {
      if (destroyed) return;
      ws = new WebSocket(url);

      ws.onopen = () => {
        if (destroyed) {
          ws.close();
          return;
        }
        setConnected(true);
      };

      ws.onmessage = (event: MessageEvent) => {
        if (!event.data || typeof event.data !== "string") return;
        try {
          const msg = JSON.parse(event.data) as Signal;
          const name = msg.name as SignalName;
          if (!(name in signalBuffers.current)) return;
          const t = new Date(msg.produced_at).getTime();
          signalBuffers.current[name].push({ t, v: msg.value });
        } catch {
          // ignore malformed frames
        }
      };

      ws.onclose = () => {
        if (destroyed) return;
        setConnected(false);
        reconnectTimeout = setTimeout(connect, 1000);
      };

      ws.onerror = () => {
        // onclose fires after onerror
      };

      flushInterval = setInterval(() => {
        const now = Date.now();
        const cutoff = now - WINDOW_MS;

        // Trim all buffers to the 2-second window
        for (const sig of SIGNALS) {
          signalBuffers.current[sig] = signalBuffers.current[sig].filter(
            (p) => p.t >= cutoff,
          );
        }

        // Build a unified sorted timeline from all timestamps in the window
        const allTs = new Set<number>();
        for (const sig of SIGNALS) {
          for (const p of signalBuffers.current[sig]) allTs.add(p.t);
        }
        if (allTs.size === 0) return;

        const sorted = Array.from(allTs).sort((a, b) => a - b);

        // For each timestamp, look up nearest value per signal
        const points: ChartPoint[] = sorted.map((t) => ({
          t,
          X: nearestValue(signalBuffers.current.gps_x_acc, t),
          Y: nearestValue(signalBuffers.current.gps_y_acc, t),
          Z: nearestValue(signalBuffers.current.gps_z_acc, t),
        }));

        // Update current readings from latest point in each buffer
        setCurrent({
          gps_x_acc: signalBuffers.current.gps_x_acc.at(-1)?.v,
          gps_y_acc: signalBuffers.current.gps_y_acc.at(-1)?.v,
          gps_z_acc: signalBuffers.current.gps_z_acc.at(-1)?.v,
        });

        setChartData(points);
      }, FLUSH_MS);
    };

    connect();

    return () => {
      destroyed = true;
      clearInterval(flushInterval);
      clearTimeout(reconnectTimeout);
      ws?.close();
    };
  }, [vehicle_id, vehicleList]);

  const formatAcc = (v: number | undefined) =>
    v !== undefined ? `${v.toFixed(3)} m/s²` : "—";

  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  return (
    <Card style={{ width, height }} className="relative flex-shrink-0">
      <div className="flex h-full w-full flex-col p-4">
        <h1 className="mb-1 text-2xl font-bold">GPS Accelerometer</h1>

        {/* Current value summary */}
        <div className="mb-3 flex gap-6">
          {SIGNALS.map((sig) => (
            <div key={sig} className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: AXIS_COLOR[sig] }}
              />
              <span className="text-sm font-medium">{AXIS_KEY[sig]}:</span>
              <span className="text-sm text-muted-foreground">
                {formatAcc(current[sig])}
              </span>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-1">
            <span
              className={`inline-block h-2 w-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
            />
            <span className="text-xs text-muted-foreground">
              {connected ? "Live" : "Reconnecting..."}
            </span>
          </div>
        </div>

        {/* Chart */}
        <div className="flex-1">
          <ChartContainer
            config={{
              X: { color: GR_COLORS.PINK, label: "X" },
              Y: { color: GR_COLORS.PURPLE, label: "Y" },
              Z: { color: "#00FFFF", label: "Z" },
            }}
          >
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={[cutoff, now]}
                hide
              />
              <YAxis
                tickFormatter={(v) => `${(v as number).toFixed(1)}`}
                label={{
                  value: "m/s²",
                  angle: -90,
                  position: "insideLeft",
                  offset: -5,
                }}
                width={55}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(v) =>
                      new Date(Number(v)).toLocaleTimeString()
                    }
                    formatter={(v, name) => [
                      `${Number(v).toFixed(4)} m/s²`,
                      name,
                    ]}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Line
                type="monotone"
                dataKey="X"
                stroke={GR_COLORS.PINK}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                animateNewValues={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="Y"
                stroke={GR_COLORS.PURPLE}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                animateNewValues={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="Z"
                stroke="#00FFFF"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                animateNewValues={false}
                connectNulls
              />
            </LineChart>
          </ChartContainer>
        </div>
      </div>
    </Card>
  );
}

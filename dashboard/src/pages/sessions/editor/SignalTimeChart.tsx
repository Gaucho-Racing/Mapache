import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { SignalSample } from "@/models/session";
import { PALETTE } from "@/lib/echartsTheme";

interface SignalTimeChartProps {
  samples: SignalSample[];
  signals: string[];
  cropStartTs: number;
  cropEndTs: number;
  // When true, each signal is min/max scaled to 0-1 so signals with different
  // ranges are comparable; raw values are still shown in the tooltip.
  normalized: boolean;
}

// Per-signal min/max, used both to normalize and to recover raw values.
function signalRanges(samples: SignalSample[], signals: string[]) {
  const ranges: Record<string, { min: number; max: number }> = {};
  for (const sig of signals) {
    let min = Infinity;
    let max = -Infinity;
    for (const s of samples) {
      const v = s[sig];
      if (v == null || Number.isNaN(v)) continue;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    ranges[sig] = { min, max };
  }
  return ranges;
}

export default function SignalTimeChart({
  samples,
  signals,
  cropStartTs,
  cropEndTs,
  normalized,
}: SignalTimeChartProps) {
  const ranges = useMemo(
    () => signalRanges(samples, signals),
    [samples, signals],
  );

  // Plot rows: keep raw values under "<sig>__raw" for the tooltip and the
  // normalized (or raw) plotted value under the signal id itself.
  const data = useMemo(() => {
    return samples.map((s) => {
      const row: Record<string, number> = { ts: s.ts };
      for (const sig of signals) {
        const v = s[sig];
        if (v == null || Number.isNaN(v)) continue;
        row[`${sig}__raw`] = v;
        if (normalized) {
          const { min, max } = ranges[sig];
          const span = max - min;
          row[sig] = span > 0 ? (v - min) / span : 0;
        } else {
          row[sig] = v;
        }
      }
      return row;
    });
  }, [samples, signals, normalized, ranges]);

  const config = useMemo(
    () =>
      Object.fromEntries(
        signals.map((sig, i) => [
          sig,
          { label: sig, color: PALETTE[i % PALETTE.length] },
        ]),
      ),
    [signals],
  );

  if (signals.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Select one or more signals to plot vs. time.
      </div>
    );
  }
  if (samples.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No data for the selected signals.
      </div>
    );
  }

  return (
    <ChartContainer config={config} className="aspect-auto h-full w-full p-4">
      <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="ts"
          type="number"
          domain={["dataMin", "dataMax"]}
          tickFormatter={(v) => new Date(v * 1000).toLocaleTimeString()}
        />
        <YAxis domain={normalized ? [0, 1] : ["auto", "auto"]} />
        {/* Shade the trimmed-out regions so the crop window is visible. */}
        <ReferenceArea x1="dataMin" x2={cropStartTs} fill="#000" fillOpacity={0.35} />
        <ReferenceArea x2="dataMax" x1={cropEndTs} fill="#000" fillOpacity={0.35} />
        <ReferenceLine x={cropStartTs} stroke="#a855f7" strokeDasharray="4 2" />
        <ReferenceLine x={cropEndTs} stroke="#ec4899" strokeDasharray="4 2" />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => {
                const ts = payload?.[0]?.payload?.ts as number | undefined;
                return ts ? new Date(ts * 1000).toLocaleString() : "";
              }}
              formatter={(_, name, item) => {
                const raw = item?.payload?.[`${name}__raw`];
                return raw == null ? "—" : Number(raw).toPrecision(5);
              }}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        {signals.map((sig, i) => (
          <Line
            key={sig}
            type="monotone"
            dataKey={sig}
            name={sig}
            dot={false}
            strokeWidth={2}
            stroke={PALETTE[i % PALETTE.length]}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}

import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { AlertTriangle } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartType } from "./ChartTypeToggle";

export interface SeriesPoint {
  bucket: string;
  value: number | null;
}

export interface Series {
  tags: Record<string, string | null>;
  points: SeriesPoint[];
}

interface QueryChartProps {
  series: Series[];
  type: ChartType;
  /** Number of seconds per bucket — drives the x-axis tick formatting. */
  intervalSec: number;
  /** Max series shown before everything beyond gets rolled into "other".
   *  Past ~12 the legend stops being useful. */
  maxSeries?: number;
  /** If set, click-and-drag on the chart highlights a range and commits
   *  it on mouse-up. Receives the [start, end) of the brushed window. */
  onBrushSelect?: (start: Date, end: Date) => void;
}

// Stable, high-contrast palette. Datadog-ish saturated colors that survive
// dark backgrounds — first slot deliberately matches our existing gr-pink
// so single-series bars don't change color when you flip into multi-series.
const PALETTE = [
  "#e105a3",
  "#8412fc",
  "#10b981",
  "#f59e0b",
  "#3b82f6",
  "#ef4444",
  "#06b6d4",
  "#84cc16",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

const OTHER_KEY = "__other__";

function formatBucketTick(iso: string, intervalSec: number): string {
  const d = new Date(iso);
  if (intervalSec >= 24 * 60 * 60) {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  if (intervalSec >= 60 * 60) {
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
    });
  }
  if (intervalSec >= 60) {
    return d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  // Sub-second buckets need millisecond precision — otherwise every tick
  // in a 50ms rollup reads the same "1:23:45 PM" and they're
  // indistinguishable. Append the zero-padded milliseconds.
  if (intervalSec < 1) {
    const base = d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
    const ms = d.getMilliseconds().toString().padStart(3, "0");
    return `${base}.${ms}`;
  }
  // Sub-minute buckets need seconds — otherwise every tick reads the
  // same "1:23 PM" and the user can't tell them apart.
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatCount(n: number): string {
  const abs = Math.abs(n);
  if (abs < 1_000) return Number.isInteger(n) ? n.toString() : n.toFixed(2);
  if (abs < 1_000_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}

/** Make a stable label for a series from its tag values. Empty tags →
 *  "value" so the single-series legend reads naturally. */
function seriesLabel(tags: Record<string, string | null>): string {
  const entries = Object.entries(tags);
  if (entries.length === 0) return "value";
  return entries.map(([, v]) => v ?? "—").join(" · ");
}

/** Sum every point in a series — for top-K ranking. Null values are 0. */
function seriesTotal(s: Series): number {
  let acc = 0;
  for (const p of s.points) acc += p.value ?? 0;
  return acc;
}

/** Roll any series past `max` into a single "other" bucket so the chart
 *  stays readable when a query produces hundreds of groups. */
function topK(series: Series[], max: number): { kept: Series[]; otherCount: number } {
  if (series.length <= max) return { kept: series, otherCount: 0 };
  const sorted = [...series].sort((a, b) => seriesTotal(b) - seriesTotal(a));
  const kept = sorted.slice(0, max);
  const tail = sorted.slice(max);
  // Build the "other" series by summing point-by-point across the tail.
  // Every series shares the same bucket axis (server zero-fills), so a
  // simple index walk is correct.
  const refBuckets = sorted[0]?.points ?? [];
  const otherPoints: SeriesPoint[] = refBuckets.map((p, i) => {
    let sum = 0;
    for (const s of tail) sum += s.points[i]?.value ?? 0;
    return { bucket: p.bucket, value: sum };
  });
  kept.push({ tags: { [OTHER_KEY]: `+${tail.length} other` }, points: otherPoints });
  return { kept, otherCount: tail.length };
}

export function QueryChart({
  series,
  type,
  intervalSec,
  maxSeries = 10,
  onBrushSelect,
}: QueryChartProps) {
  // Brush state. `start` is fixed on mousedown; `current` follows the
  // mouse and renders the live highlight. We commit on mouseup when the
  // two are distinct buckets — a same-bucket release is treated as a
  // click (tooltip), not a selection, so single clicks keep working.
  const [brushStart, setBrushStart] = useState<string | null>(null);
  const [brushCurrent, setBrushCurrent] = useState<string | null>(null);

  type ChartMouseEvent = { activeLabel?: string | number | null };
  const handleMouseDown = onBrushSelect
    ? (e: ChartMouseEvent | null) => {
        const label = e?.activeLabel;
        if (typeof label === "string") {
          setBrushStart(label);
          setBrushCurrent(label);
        }
      }
    : undefined;
  const handleMouseMove = onBrushSelect
    ? (e: ChartMouseEvent | null) => {
        if (brushStart === null) return;
        const label = e?.activeLabel;
        if (typeof label === "string") setBrushCurrent(label);
      }
    : undefined;
  const handleMouseUp = onBrushSelect
    ? () => {
        if (brushStart !== null && brushCurrent !== null && brushStart !== brushCurrent) {
          const a = new Date(brushStart);
          const b = new Date(brushCurrent);
          const [start, end] = a < b ? [a, b] : [b, a];
          // Extend `end` to the *end* of its bucket so a brush that
          // visually covers a bar actually includes that bar's data.
          // intervalSec is the bucket width in seconds.
          onBrushSelect(
            start,
            new Date(end.getTime() + intervalSec * 1000),
          );
        }
        setBrushStart(null);
        setBrushCurrent(null);
      }
    : undefined;
  // Cancel an in-progress drag if the cursor leaves the chart — avoids
  // a stuck highlight when the user releases the button off-chart.
  const handleMouseLeave = onBrushSelect
    ? () => {
        setBrushStart(null);
        setBrushCurrent(null);
      }
    : undefined;
  // Top-K rollup before any other shaping; bar/area would stack hundreds
  // of slivers otherwise.
  const { kept } = useMemo(() => topK(series, maxSeries), [series, maxSeries]);

  // Pivot tall → wide so recharts can render multiple series from one
  // dataset. Each row: { bucket, [seriesKey1]: value1, [seriesKey2]: ... }.
  // Series keys are array indices ("s0", "s1", ...) so we never collide on
  // user-provided values like "name".
  const { data, seriesKeys, config } = useMemo(() => {
    const seriesKeys: { key: string; label: string; color: string }[] = kept.map(
      (s, i) => ({
        key: `s${i}`,
        label: seriesLabel(s.tags),
        color: PALETTE[i % PALETTE.length],
      }),
    );
    const config: ChartConfig = Object.fromEntries(
      seriesKeys.map(({ key, label, color }) => [key, { label, color }]),
    );
    const buckets = kept[0]?.points.map((p) => p.bucket) ?? [];
    const data = buckets.map((bucket, i) => {
      const row: Record<string, string | number | null> = { bucket };
      kept.forEach((s, sIdx) => {
        row[`s${sIdx}`] = s.points[i]?.value ?? 0;
      });
      return row;
    });
    return { data, seriesKeys, config };
  }, [kept]);

  const isMulti = seriesKeys.length > 1;
  // Bar/area stack by default in multi-series; line doesn't (lines stacked
  // on top of each other are unreadable). Single-series ignores stackId.
  const stackId = isMulti && type !== "line" ? "stack" : undefined;

  // Safety rail. Recharts is SVG-based — each bucket × series renders a
  // DOM element, and the browser starts choking past ~20k of them. Bar
  // charts hit this hardest (one <rect> per bar); line charts only render
  // one <path> per series so they're cheap. We treat any chart type the
  // same here for simplicity — if 20k is too conservative for line later,
  // we can split the threshold by type.
  const RENDER_LIMIT = 20_000;
  const renderElementCount = data.length * Math.max(1, seriesKeys.length);
  const renderSig = `${data.length}x${seriesKeys.length}`;
  const [confirmedSig, setConfirmedSig] = useState<string | null>(null);
  const needsConfirm =
    renderElementCount > RENDER_LIMIT && confirmedSig !== renderSig;

  if (data.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
        No data in this window
      </div>
    );
  }

  if (needsConfirm) {
    return (
      <div className="flex h-[260px] flex-col items-center justify-center gap-3 rounded-md border border-dashed border-amber-500/40 bg-amber-500/5 p-6 text-center">
        <AlertTriangle className="h-6 w-6 text-amber-500" />
        <div>
          <p className="text-sm font-medium">
            Large render &mdash;{" "}
            {data.length.toLocaleString()} buckets &times;{" "}
            {seriesKeys.length} series ={" "}
            {renderElementCount.toLocaleString()} elements
          </p>
          <p className="mt-1 max-w-md text-xs text-muted-foreground">
            Past about {RENDER_LIMIT.toLocaleString()} SVG elements the browser
            tab can hang. Pick a coarser rollup or a narrower timeframe, or
            render anyway.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirmedSig(renderSig)}
        >
          Render anyway
        </Button>
      </div>
    );
  }

  const commonAxes = (
    <>
      <CartesianGrid strokeDasharray="3 3" vertical={false} />
      <XAxis
        dataKey="bucket"
        tickFormatter={(v) => formatBucketTick(v, intervalSec)}
        tickLine={false}
        axisLine={false}
        minTickGap={32}
      />
      <YAxis
        tickFormatter={formatCount}
        tickLine={false}
        axisLine={false}
        width={48}
      />
      <ChartTooltip
        content={
          <ChartTooltipContent
            labelFormatter={(v) => new Date(v as string).toLocaleString()}
          />
        }
      />
    </>
  );

  // Shared props for whichever chart variant we render below.
  const chartProps = {
    data,
    margin: { top: 8, right: 8, left: -16, bottom: 0 },
    onMouseDown: handleMouseDown,
    onMouseMove: handleMouseMove,
    onMouseUp: handleMouseUp,
    onMouseLeave: handleMouseLeave,
    // Drag-to-select feels wrong with text selection happening underneath.
    style: onBrushSelect ? { userSelect: "none" as const, cursor: "crosshair" as const } : undefined,
  };

  const brushHighlight =
    brushStart !== null && brushCurrent !== null && brushStart !== brushCurrent ? (
      <ReferenceArea
        x1={brushStart}
        x2={brushCurrent}
        strokeOpacity={0}
        fill="currentColor"
        fillOpacity={0.12}
      />
    ) : null;

  return (
    <ChartContainer config={config} className="h-[260px] w-full">
      {type === "bar" ? (
        <BarChart {...chartProps}>
          {commonAxes}
          {seriesKeys.map(({ key }) => (
            <Bar
              key={key}
              dataKey={key}
              fill={`var(--color-${key})`}
              stackId={stackId}
              radius={[2, 2, 0, 0]}
            />
          ))}
          {brushHighlight}
        </BarChart>
      ) : type === "line" ? (
        <LineChart {...chartProps}>
          {commonAxes}
          {seriesKeys.map(({ key }) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={`var(--color-${key})`}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          ))}
          {brushHighlight}
        </LineChart>
      ) : (
        <AreaChart {...chartProps}>
          {commonAxes}
          {seriesKeys.map(({ key }) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stroke={`var(--color-${key})`}
              fill={`var(--color-${key})`}
              fillOpacity={0.25}
              stackId={stackId}
              isAnimationActive={false}
            />
          ))}
          {brushHighlight}
        </AreaChart>
      )}
    </ChartContainer>
  );
}

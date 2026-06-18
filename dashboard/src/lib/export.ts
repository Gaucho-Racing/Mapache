import type { ECharts } from "echarts/core";
import { seriesLabel, type Series } from "@/components/signals/QueryChart";

// Trigger a browser download for an object URL or data URL. Object URLs are
// revoked next tick so the click has time to start.
function triggerDownload(href: string, filename: string, isObjectUrl: boolean) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (isObjectUrl) setTimeout(() => URL.revokeObjectURL(href), 0);
}

/** Download arbitrary text (here, CSV) as a file via a transient object URL. */
export function downloadText(text: string, filename: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  triggerDownload(URL.createObjectURL(blob), filename, true);
}

// Escape one CSV field per RFC 4180; plain values pass through untouched.
function csvField(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Plotted series → CSV: a leading `time` column (the shared bucket axis) plus
 *  one column per series, labeled as the legend reads it. Values are the true
 *  un-normalized numbers; null buckets are empty cells. */
export function seriesToCsv(series: Series[], headers = true): string {
  const buckets = series[0]?.points.map((p) => p.bucket) ?? [];
  const header = ["time", ...series.map((s) => seriesLabel(s.tags))];
  const rows = buckets.map((bucket, bi) => {
    const cells = [bucket];
    for (const s of series) {
      const v = s.points[bi]?.value;
      cells.push(v === null || v === undefined ? "" : String(v));
    }
    return cells.map(csvField).join(",");
  });
  return (headers ? [header.map(csvField).join(","), ...rows] : rows).join("\n");
}

/** Plotted series → JSON. Same semantics as `seriesToCsv`; null buckets → `null`.
 *  Shape depends on `headers`:
 *   - `true`  → array of objects keyed `time` plus one entry per series label.
 *   - `false` → array of value-arrays, each `[time, ...values]` (no labels). */
export function seriesToJson(series: Series[], headers = true): string {
  const buckets = series[0]?.points.map((p) => p.bucket) ?? [];
  const rows = buckets.map((bucket, bi) => {
    if (!headers) {
      const cells: (string | number | null)[] = [bucket];
      for (const s of series) {
        const v = s.points[bi]?.value;
        cells.push(v === undefined ? null : v);
      }
      return cells;
    }
    const row: Record<string, string | number | null> = { time: bucket };
    for (const s of series) {
      const v = s.points[bi]?.value;
      row[seriesLabel(s.tags)] = v === undefined ? null : v;
    }
    return row;
  });
  return JSON.stringify(rows, null, 2);
}

export interface ChartLabels {
  title?: string;
  xName?: string;
  yName?: string;
}

export interface ChartPngOptions {
  /** Any CSS color or "transparent". */
  backgroundColor?: string;
  /** Raster scale for hi-DPI crispness. */
  pixelRatio?: number;
  /** When set, the rasterized PNG temporarily gains a chart title and
   *  x/y axis name labels that the live chart normally hides. */
  labels?: ChartLabels;
}

/** Rasterize the chart with the data URL captured while the optional title /
 *  axis labels are applied, then restore the original option. The temporary
 *  option is always rolled back, even if `getDataURL` throws.
 *
 *  `setOption` is synchronous, so the canvas reflects the labels by the time
 *  `getDataURL` reads it. The app's `xAxis` is a single object while `yAxis`
 *  may be an array (QueryChart) or a single object (PlotChart), so both forms
 *  are patched defensively. */
function rasterizeWithLabels(
  instance: ECharts,
  labels: ChartLabels | undefined,
  read: () => string,
): string {
  if (!labels) return read();

  const prev = instance.getOption();
  const applyName = (
    axis: unknown,
    name: string | undefined,
  ): unknown => {
    if (name === undefined) return axis;
    if (Array.isArray(axis)) {
      return axis.map((a, i) =>
        i === 0 ? { ...(a as object), name } : a,
      );
    }
    return { ...(axis as object), name };
  };

  try {
    // A centered top title overlaps the plot, so nudge the grid down to make
    // room. `grid` may be an object, array, or absent (e.g. pie has none), so
    // merge defensively only when a title is actually present.
    const gridNudge = labels.title
      ? (() => {
          const g = prev.grid;
          if (Array.isArray(g)) {
            return g.map((x) => ({ ...(x as object), top: 48 }));
          }
          return { ...((g as object) ?? {}), top: 48 };
        })()
      : undefined;
    instance.setOption(
      {
        title: { text: labels.title ?? "", left: "center" },
        xAxis: applyName(prev.xAxis, labels.xName),
        yAxis: applyName(prev.yAxis, labels.yName),
        ...(gridNudge ? { grid: gridNudge } : {}),
      },
      { lazyUpdate: false },
    );
    return read();
  } finally {
    instance.setOption(prev, { notMerge: true, lazyUpdate: false });
  }
}

/** Export an ECharts instance as a PNG download (white bg at 2x by default). */
export function downloadChartPng(
  instance: ECharts,
  filename: string,
  opts: ChartPngOptions = {},
) {
  const { backgroundColor = "#fff", pixelRatio = 2, labels } = opts;
  const url = rasterizeWithLabels(instance, labels, () =>
    instance.getDataURL({ type: "png", pixelRatio, backgroundColor }),
  );
  triggerDownload(url, filename, false);
}

/** Render the chart to a PNG and write it to the clipboard. Throws on failure
 *  so the caller can surface a toast. */
export async function copyChartToClipboard(
  instance: ECharts,
  opts: { backgroundColor?: string; labels?: ChartLabels } = {},
): Promise<void> {
  const { backgroundColor = "#fff", labels } = opts;
  const url = rasterizeWithLabels(instance, labels, () =>
    instance.getDataURL({ type: "png", pixelRatio: 2, backgroundColor }),
  );
  const blob = await (await fetch(url)).blob();
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}

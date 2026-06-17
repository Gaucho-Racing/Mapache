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
export function seriesToCsv(series: Series[]): string {
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
  return [header.map(csvField).join(","), ...rows].join("\n");
}

/** Plotted series → JSON: one row object per bucket, keyed `time` plus one
 *  entry per series. Same semantics as `seriesToCsv`; null buckets → `null`. */
export function seriesToJson(series: Series[]): string {
  const buckets = series[0]?.points.map((p) => p.bucket) ?? [];
  const rows = buckets.map((bucket, bi) => {
    const row: Record<string, string | number | null> = { time: bucket };
    for (const s of series) {
      const v = s.points[bi]?.value;
      row[seriesLabel(s.tags)] = v === undefined ? null : v;
    }
    return row;
  });
  return JSON.stringify(rows, null, 2);
}

export interface ChartPngOptions {
  /** Any CSS color or "transparent". */
  backgroundColor?: string;
  /** Raster scale for hi-DPI crispness. */
  pixelRatio?: number;
}

/** Export an ECharts instance as a PNG download (white bg at 2x by default). */
export function downloadChartPng(
  instance: ECharts,
  filename: string,
  opts: ChartPngOptions = {},
) {
  const { backgroundColor = "#fff", pixelRatio = 2 } = opts;
  const url = instance.getDataURL({ type: "png", pixelRatio, backgroundColor });
  triggerDownload(url, filename, false);
}

/** Render the chart to a PNG and write it to the clipboard. Throws on failure
 *  so the caller can surface a toast. */
export async function copyChartToClipboard(
  instance: ECharts,
  opts: { backgroundColor?: string } = {},
): Promise<void> {
  const { backgroundColor = "#fff" } = opts;
  const url = instance.getDataURL({ type: "png", pixelRatio: 2, backgroundColor });
  const blob = await (await fetch(url)).blob();
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}

import type { ECharts } from "echarts/core";
import { seriesLabel, type Series } from "@/components/signals/QueryChart";

// Trigger a browser download for an in-memory payload. Works for both a Blob
// (CSV text) and a ready-made data URL (the PNG ECharts hands back). Object
// URLs are revoked on the next tick so the click has time to start.
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

// Escape one CSV field: wrap in quotes and double any embedded quotes when the
// value contains a comma, quote, or newline (RFC 4180). Plain values pass
// through untouched so numeric columns stay clean.
function csvField(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Shape the plotted series into a CSV string: a leading `time` column (the
 *  shared, server-aligned bucket ISO axis) followed by one column per series,
 *  labeled exactly as the chart legend reads it (`seriesLabel`). The values are
 *  the true, un-normalized bucket values — normalization is a display-only
 *  rescale, so the export always carries real numbers. Null buckets render as
 *  empty cells. Base series and derived/expression traces are columns alike.
 *
 *  Every series shares the same bucket axis (the backend zero-fills), so the
 *  first series' buckets define the rows and the rest index-align onto them. */
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

/** Shape the plotted series into a JSON string: an array of row objects, one
 *  per shared bucket, keyed `time` (the bucket ISO) plus one entry per series
 *  labeled exactly as the chart legend reads it (`seriesLabel`). Mirrors
 *  `seriesToCsv` semantics — same rows (the first series' buckets), true
 *  un-normalized values, and null buckets emitted as JSON `null`. Pretty-
 *  printed at 2-space indent. */
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

/** Options for rendering an ECharts instance to a PNG. `backgroundColor`
 *  accepts any CSS color or `"transparent"`; `pixelRatio` scales the raster
 *  for crispness on hi-DPI displays. */
export interface ChartPngOptions {
  backgroundColor?: string;
  pixelRatio?: number;
}

/** Export an ECharts instance as a PNG download. Defaults to a white
 *  background at 2x so existing callers keep a crisp, legible image outside
 *  the app's dark theme; pass `backgroundColor: "transparent"` for a
 *  transparent PNG, or the resolved `--background` color for a dark one. */
export function downloadChartPng(
  instance: ECharts,
  filename: string,
  opts: ChartPngOptions = {},
) {
  const { backgroundColor = "#fff", pixelRatio = 2 } = opts;
  const url = instance.getDataURL({ type: "png", pixelRatio, backgroundColor });
  triggerDownload(url, filename, false);
}

/** Render the chart to a PNG and write it to the system clipboard as an
 *  `image/png` blob. Throws on any failure (unsupported browser, denied
 *  clipboard permission) so the caller can surface a toast. */
export async function copyChartToClipboard(
  instance: ECharts,
  opts: { backgroundColor?: string } = {},
): Promise<void> {
  const { backgroundColor = "#fff" } = opts;
  const url = instance.getDataURL({ type: "png", pixelRatio: 2, backgroundColor });
  const blob = await (await fetch(url)).blob();
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}

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

/** Export an ECharts instance as a PNG download. `getDataURL` renders the
 *  current on-screen chart to a data URL at 2x for a crisp image; a white
 *  background keeps it legible outside the app's dark theme. */
export function downloadChartPng(instance: ECharts, filename: string) {
  const url = instance.getDataURL({
    type: "png",
    pixelRatio: 2,
    backgroundColor: "#fff",
  });
  triggerDownload(url, filename, false);
}

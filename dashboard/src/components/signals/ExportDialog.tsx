import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { seriesLabel, type Series } from "@/components/signals/QueryChart";
import {
  copyChartToClipboard,
  downloadChartPng,
  downloadText,
  seriesToCsv,
  seriesToJson,
} from "@/lib/export";
import type { ECharts } from "echarts/core";
import { Clipboard, FileJson, FileSpreadsheet, ImageDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Read the live ECharts instance lazily — collapsed charts return null. */
  getInstance: () => ECharts | null;
  /** Series currently on the plot (base + derived, minus hidden). */
  visibleSeries: Series[];
  /** Every known series, including hidden traces. */
  allSeries: Series[];
  /** Chart body is collapsed — there's no live instance to rasterize. */
  chartHidden: boolean;
  defaultFilename?: string;
}

type BgKey = "light" | "dark" | "transparent";

const BG_LABELS: Record<BgKey, string> = {
  light: "Light",
  dark: "Dark",
  transparent: "Transparent",
};

/** Resolve an HSL CSS custom property (stored as "H S% L%") to an `hsl(...)`
 *  string. Replicated locally (cf. QueryChart's `cssHsl`) so the export path
 *  doesn't couple to the chart module. Falls back to a dark grey. */
function resolveBackground(key: BgKey): string {
  if (key === "light") return "#fff";
  if (key === "transparent") return "transparent";
  // Dark → the app's themed background var.
  if (typeof window === "undefined") return "#0a0a0a";
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--background")
    .trim();
  return raw ? `hsl(${raw})` : "#0a0a0a";
}

export function ExportDialog({
  open,
  onOpenChange,
  getInstance,
  visibleSeries,
  allSeries,
  chartHidden,
  defaultFilename = "signals",
}: ExportDialogProps) {
  const [filename, setFilename] = useState(defaultFilename);
  const [bg, setBg] = useState<BgKey>("light");
  const [scale, setScale] = useState("2");
  const [includeHidden, setIncludeHidden] = useState(false);
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [includeLabels, setIncludeLabels] = useState(false);

  // Image export needs a live instance, which a collapsed chart doesn't have.
  const imageDisabled = chartHidden || !getInstance();

  const safeName = filename.trim() || defaultFilename;

  // Title is the export filename; x is the shared time bucket axis, and y is
  // the lone series label when unambiguous, else a generic "value".
  const chartLabels = () => ({
    title: safeName,
    xName: "time",
    yName:
      visibleSeries.length === 1
        ? seriesLabel(visibleSeries[0].tags)
        : "value",
  });

  const downloadPng = () => {
    const inst = getInstance();
    if (!inst) return;
    downloadChartPng(inst, `${safeName}.png`, {
      backgroundColor: resolveBackground(bg),
      pixelRatio: Number(scale),
      labels: includeLabels ? chartLabels() : undefined,
    });
  };

  const dataSeries = includeHidden ? allSeries : visibleSeries;

  const downloadCsv = () =>
    downloadText(
      seriesToCsv(dataSeries, includeHeaders),
      `${safeName}.csv`,
      "text/csv",
    );
  const downloadJson = () =>
    downloadText(
      seriesToJson(dataSeries, includeHeaders),
      `${safeName}.json`,
      "application/json",
    );

  const copyImage = async () => {
    const inst = getInstance();
    if (!inst) return;
    try {
      await copyChartToClipboard(inst, {
        backgroundColor: resolveBackground(bg),
        labels: includeLabels ? chartLabels() : undefined,
      });
      toast.success("Chart copied to clipboard");
    } catch {
      toast.error("Couldn't copy chart to clipboard");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export</DialogTitle>
          <DialogDescription>
            Download the chart image or the underlying data.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {/* Filename — shared by every download (extension appended per type). */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="export-filename">Filename</Label>
            <Input
              id="export-filename"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder={defaultFilename}
            />
          </div>

          {/* Image (PNG) */}
          <div className="flex flex-col gap-3">
            <div className="text-sm font-medium">Image</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Background</Label>
                <Select
                  value={bg}
                  onValueChange={(v) => setBg(v as BgKey)}
                  disabled={imageDisabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(BG_LABELS) as BgKey[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {BG_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Scale</Label>
                <Select
                  value={scale}
                  onValueChange={setScale}
                  disabled={imageDisabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["1", "2", "3", "4"].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}x
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={downloadPng}
                disabled={imageDisabled}
              >
                <ImageDown className="mr-2 h-4 w-4" />
                Download PNG
              </Button>
              <Button
                variant="outline"
                onClick={copyImage}
                disabled={imageDisabled}
              >
                <Clipboard className="mr-2 h-4 w-4" />
                Copy to clipboard
              </Button>
            </div>
            <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={includeLabels}
                onChange={(e) => setIncludeLabels(e.target.checked)}
                disabled={imageDisabled}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              Include title &amp; axis labels
            </label>
            {imageDisabled && (
              <div className="text-xs text-muted-foreground">
                Show the chart to export or copy its image.
              </div>
            )}
          </div>

          {/* Data */}
          <div className="flex flex-col gap-3">
            <div className="text-sm font-medium">Data</div>
            <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={includeHidden}
                onChange={(e) => setIncludeHidden(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              Include hidden traces
            </label>
            <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={includeHeaders}
                onChange={(e) => setIncludeHeaders(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              Include header row
            </label>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={downloadCsv}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Download CSV
              </Button>
              <Button variant="outline" onClick={downloadJson}>
                <FileJson className="mr-2 h-4 w-4" />
                Download JSON
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

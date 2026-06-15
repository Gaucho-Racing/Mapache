import { seriesLabel, type AxisSetting, type Series } from "./QueryChart";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Per-trace y-axis controls (T8)
//
// Each plotted series (base + derived) gets a row letting the user pick one of
// two y-scaling behaviors:
//   - a shared-scale *group* (native units) — every trace in the same group id
//     shares ONE real-value axis and keeps its true relative height, or
//   - *normalize*, which min/max-rescales just that trace to [0,1] so its peak
//     reaches the top of the plot regardless of the other traces' magnitudes.
//
// Styled to match DerivedTraces' chip/sentence language: a muted section
// label, compact rows, and a small swatch echoing the chart palette so the
// user can tie a row back to its line.
// ---------------------------------------------------------------------------

// A small fixed set of group ids is plenty — past a handful of distinct
// native scales the chart is unreadable anyway. These are the buttons offered
// in each row's group picker.
const GROUP_IDS = ["1", "2", "3"] as const;

/** Resolve a series' current setting, falling back to the default (shared
 *  group "1", un-normalized) so an untouched widget reads as today. */
export function axisSettingFor(
  settings: Record<string, AxisSetting>,
  label: string,
): AxisSetting {
  return settings[label] ?? { axisGroup: "1", normalize: false };
}

interface TraceAxisControlsProps {
  /** The currently plotted series (base + derived), in palette order. The
   *  index gives each row its swatch color (mirrors QueryChart's PALETTE). */
  series: Series[];
  /** label → rendered line color, from QueryChart's `seriesColorMap`, so each
   *  row's swatch matches the actual on-screen line *after* top-K reordering.
   *  Labels folded into "+N other" are absent and get a neutral swatch. */
  colors: Map<string, string>;
  /** Current per-label settings map (sparse — missing labels are default). */
  settings: Record<string, AxisSetting>;
  /** Patch one label's setting. */
  onChange: (label: string, patch: Partial<AxisSetting>) => void;
}

/** Compact editor for per-trace normalization + axis grouping. Lives below
 *  the DerivedTraces editor. Renders nothing until there's at least one series
 *  to configure. */
export function TraceAxisControls({
  series,
  colors,
  settings,
  onChange,
}: TraceAxisControlsProps) {
  if (series.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <span className="select-none text-xs font-medium text-muted-foreground">
        Y-axis scaling
      </span>

      {series.map((s) => {
        const label = seriesLabel(s.tags);
        const setting = axisSettingFor(settings, label);
        // Match the chart's actual color (post top-K). A label rolled into
        // the "+N other" bucket has no individual line — show a neutral chip.
        const color = colors.get(label);
        return (
          <div key={label} className="flex items-center gap-2">
            <span
              className={cn(
                "h-2.5 w-2.5 shrink-0 rounded-sm",
                !color && "bg-muted-foreground/30",
              )}
              style={color ? { backgroundColor: color } : undefined}
              aria-hidden
            />
            <span className="w-32 truncate font-mono text-xs text-foreground">
              {label}
            </span>

            {/* Normalize toggle — when on, the row's group picker is hidden
                since the trace lives on the shared [0,1] axis. */}
            <button
              type="button"
              onClick={() => onChange(label, { normalize: !setting.normalize })}
              className={cn(
                "inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium transition-colors",
                setting.normalize
                  ? "border-primary/50 bg-accent text-foreground"
                  : "border-dashed bg-transparent text-muted-foreground hover:border-primary/40 hover:bg-accent/40 hover:text-foreground",
              )}
              title="Rescale this trace to fill the plot (min/max → 0..1)"
            >
              normalize
            </button>

            {/* Group picker — only meaningful for native (un-normalized)
                traces. Hidden for normalized rows to keep the row honest. */}
            {!setting.normalize ? (
              <div className="flex items-center gap-1">
                <span className="select-none text-xs text-muted-foreground/70">
                  group
                </span>
                {GROUP_IDS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => onChange(label, { axisGroup: g })}
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-md border text-xs font-medium transition-colors",
                      setting.axisGroup === g
                        ? "border-primary/50 bg-accent text-foreground"
                        : "border-dashed bg-transparent text-muted-foreground hover:border-primary/40 hover:bg-accent/40 hover:text-foreground",
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

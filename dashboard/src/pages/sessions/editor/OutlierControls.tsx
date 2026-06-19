import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { GeoPoint } from "@/models/session";
import { DEFAULT_OUTLIER_CONFIG, OutlierConfig } from "@/lib/sessions/outliers";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface OutlierControlsProps {
  config: OutlierConfig;
  onChange: (next: OutlierConfig) => void;
  excluded: GeoPoint[];
}

const MAX_LISTED = 50;

function fmtTime(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString();
}

export default function OutlierControls({
  config,
  onChange,
  excluded,
}: OutlierControlsProps) {
  const [listOpen, setListOpen] = useState(false);
  // Raw string lets the field be emptied mid-edit without snapping to 0;
  // null means "show the committed config value".
  const [sigmaDraft, setSigmaDraft] = useState<string | null>(null);

  const apply = (patch: Partial<OutlierConfig>) =>
    onChange({ ...config, ...patch });

  return (
    <div className="flex flex-col gap-3">
      <Label className="text-xs font-semibold uppercase text-neutral-500">
        Outlier removal
      </Label>

      <label className="flex items-center gap-2 text-xs text-neutral-300">
        <input
          type="checkbox"
          checked={config.sigmaOn}
          onChange={(e) => apply({ sigmaOn: e.target.checked })}
          className="h-3.5 w-3.5 rounded border-input accent-gr-purple"
        />
        <span>Remove GPS outliers</span>
      </label>

      {config.sigmaOn ? (
        <div className="flex items-center gap-2 pl-6 text-xs text-neutral-400">
          <span>beyond</span>
          <Input
            type="number"
            value={sigmaDraft ?? config.sigmaN}
            onChange={(e) => {
              const v = e.target.value;
              setSigmaDraft(v);
              if (v.trim() !== "") apply({ sigmaN: Number(v) });
            }}
            onBlur={() => {
              if (sigmaDraft !== null && sigmaDraft.trim() === "") {
                apply({ sigmaN: DEFAULT_OUTLIER_CONFIG.sigmaN });
              }
              setSigmaDraft(null);
            }}
            className="h-7 w-16 font-mono text-xs"
          />
          <span>σ</span>
        </div>
      ) : null}

      <div className="flex items-center gap-2 text-xs text-neutral-400">
        <span className="flex-shrink-0">Max distance</span>
        <Input
          type="number"
          placeholder="off"
          value={config.maxDistanceM ?? ""}
          onChange={(e) => {
            const v = e.target.value.trim();
            apply({ maxDistanceM: v === "" ? null : Number(v) });
          }}
          className="h-7 w-20 font-mono text-xs"
        />
        <span>m</span>
      </div>

      {excluded.length > 0 ? (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setListOpen((o) => !o)}
            className="flex items-center gap-1 text-xs text-neutral-300 hover:text-white"
          >
            {listOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            {excluded.length} point{excluded.length === 1 ? "" : "s"} excluded
          </button>
          {listOpen ? (
            <div className="max-h-40 overflow-auto rounded-md bg-neutral-900 p-2 font-mono text-[11px] text-neutral-400">
              {excluded.slice(0, MAX_LISTED).map((p, i) => (
                <div key={i} className="flex justify-between gap-2">
                  <span>{fmtTime(p.ts)}</span>
                  <span>
                    {p.lat.toFixed(5)}, {p.lon.toFixed(5)}
                  </span>
                </div>
              ))}
              {excluded.length > MAX_LISTED ? (
                <div className="pt-1 text-neutral-500">
                  +{excluded.length - MAX_LISTED} more
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

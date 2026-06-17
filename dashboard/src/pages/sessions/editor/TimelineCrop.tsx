interface TimelineCropProps {
  extentStartTs: number;
  extentEndTs: number;
  cropStartTs: number;
  cropEndTs: number;
  onChange: (cropStartTs: number, cropEndTs: number) => void;
  // Epoch-second timestamps of excluded outliers, drawn as red ticks.
  markers?: number[];
}

function fmt(ts: number): string {
  if (!isFinite(ts)) return "—";
  return new Date(ts * 1000).toLocaleTimeString();
}

// A lightweight dual-handle crop control over the data's time extent. Values
// are epoch seconds; the sliders operate on a 0-1000 fraction for resolution.
export default function TimelineCrop({
  extentStartTs,
  extentEndTs,
  cropStartTs,
  cropEndTs,
  onChange,
  markers,
}: TimelineCropProps) {
  const span = extentEndTs - extentStartTs || 1;
  const toFrac = (ts: number) => ((ts - extentStartTs) / span) * 1000;
  const fromFrac = (f: number) => extentStartTs + (f / 1000) * span;

  const startFrac = toFrac(cropStartTs);
  const endFrac = toFrac(cropEndTs);

  return (
    <div className="flex flex-col gap-2 rounded-md bg-neutral-900 p-3">
      <div className="flex justify-between text-xs text-neutral-400">
        <span>Crop: {fmt(cropStartTs)}</span>
        <span>{fmt(cropEndTs)}</span>
      </div>
      {markers && markers.length > 0 ? (
        <div className="relative h-2" title={`${markers.length} excluded outliers`}>
          {markers.map((ts, i) => (
            <span
              key={i}
              className="absolute top-0 h-2 w-px bg-red-500"
              style={{ left: `${(toFrac(ts) / 1000) * 100}%` }}
            />
          ))}
        </div>
      ) : null}
      <div className="flex flex-col gap-1">
        <input
          type="range"
          min={0}
          max={1000}
          value={isFinite(startFrac) ? startFrac : 0}
          onChange={(e) => {
            const next = fromFrac(Number(e.target.value));
            onChange(Math.min(next, cropEndTs), cropEndTs);
          }}
          className="accent-gr-purple"
        />
        <input
          type="range"
          min={0}
          max={1000}
          value={isFinite(endFrac) ? endFrac : 1000}
          onChange={(e) => {
            const next = fromFrac(Number(e.target.value));
            onChange(cropStartTs, Math.max(next, cropStartTs));
          }}
          className="accent-gr-pink"
        />
      </div>
    </div>
  );
}

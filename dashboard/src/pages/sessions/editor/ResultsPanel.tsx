import { LapResult } from "@/models/session";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ResultsPanelProps {
  result: LapResult | null;
  canSave: boolean;
  onProcess: () => void;
  onSave: () => void;
  onExport: () => void;
}

function fmtTime(s: number): string {
  if (!isFinite(s)) return "—";
  const m = Math.floor(s / 60);
  const sec = s - m * 60;
  return m > 0 ? `${m}:${sec.toFixed(3).padStart(6, "0")}` : sec.toFixed(3);
}

export default function ResultsPanel({
  result,
  canSave,
  onProcess,
  onSave,
  onExport,
}: ResultsPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Button size="sm" onClick={onProcess}>
          Process Laps
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onSave}
          disabled={!canSave || !result || result.lapCount === 0}
        >
          Save
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onExport}
          disabled={!result}
        >
          Export CSV
        </Button>
      </div>

      {result && result.lapCount > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded bg-neutral-900 p-2">
              <div className="text-xs text-neutral-400">Laps</div>
              <div className="font-mono">{result.lapCount}</div>
            </div>
            <div className="rounded bg-neutral-900 p-2">
              <div className="text-xs text-neutral-400">Best</div>
              <div className="font-mono text-gr-pink">
                {fmtTime(result.bestTime)}
              </div>
            </div>
            <div className="rounded bg-neutral-900 p-2">
              <div className="text-xs text-neutral-400">Avg</div>
              <div className="font-mono">{fmtTime(result.avgTime)}</div>
            </div>
            <div className="rounded bg-neutral-900 p-2">
              <div className="text-xs text-neutral-400">Worst</div>
              <div className="font-mono">{fmtTime(result.worstTime)}</div>
            </div>
          </div>

          <div className="max-h-64 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lap</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.lapTimes.map((t, i) => (
                  <TableRow key={i}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell
                      className={`font-mono ${t === result.bestTime ? "text-gr-pink" : ""}`}
                    >
                      {fmtTime(t)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : (
        <div className="text-sm text-neutral-500">
          {result
            ? "No laps detected — check the S/F line placement."
            : "Place a Start/Finish line and process to see laps."}
        </div>
      )}
    </div>
  );
}

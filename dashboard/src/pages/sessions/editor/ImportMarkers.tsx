import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Session, hasAnalysis } from "@/models/session";

interface ImportMarkersProps {
  // Other sessions of the same vehicle with usable analysis segments.
  sessions: Session[];
  currentSessionId: string | undefined;
  disabled: boolean;
  // Re-projects the chosen session's segments. Without `force`, returns false
  // when the imported geometry doesn't overlap the current track (the caller
  // then surfaces the warning); with `force` it always applies and returns true.
  onImport: (source: Session, force: boolean) => Promise<boolean>;
}

export default function ImportMarkers({
  sessions,
  currentSessionId,
  disabled,
  onImport,
}: ImportMarkersProps) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [pendingSource, setPendingSource] = useState<Session | null>(null);

  const candidates = useMemo(
    () =>
      sessions.filter(
        (s) =>
          s.id !== currentSessionId &&
          hasAnalysis(s.analysis) &&
          Object.keys(s.analysis.segments || {}).length > 0,
      ),
    [sessions, currentSessionId],
  );

  const finish = () => {
    setOpen(false);
    setSelectedId("");
    setPendingSource(null);
  };

  const handleImport = async (source: Session, force: boolean) => {
    setBusy(true);
    try {
      const applied = await onImport(source, force);
      if (applied) finish();
      else setPendingSource(source);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <Button
          size="sm"
          variant="outline"
          disabled={disabled || candidates.length === 0}
          onClick={() => setOpen(true)}
        >
          Import markers
        </Button>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Import lap markers</DialogTitle>
            <DialogDescription>
              Reuse the S/F line and sector boundaries from another session.
              Re-process laps (P) after importing.
            </DialogDescription>
          </DialogHeader>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a session" />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name || s.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              size="sm"
              disabled={!selectedId || busy}
              onClick={() => {
                const source = candidates.find((s) => s.id === selectedId);
                if (source) handleImport(source, false);
              }}
            >
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!pendingSource}
        onOpenChange={(o) => !o && setPendingSource(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Markers don&apos;t overlap</DialogTitle>
            <DialogDescription>
              The imported markers fall outside this session&apos;s GPS track, so
              they likely belong to a different location. Import anyway?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPendingSource(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={busy}
              onClick={() => pendingSource && handleImport(pendingSource, true)}
            >
              Import anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

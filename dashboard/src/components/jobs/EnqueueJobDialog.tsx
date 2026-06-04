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
import { Textarea } from "@/components/ui/textarea";
import { BACKEND_URL } from "@/consts/config";
import { getAxiosErrorMessage } from "@/lib/axios-error-handler";
import { notify } from "@/lib/notify";
import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface Preset {
  kind: string;
  description: string;
  params: Record<string, unknown>;
  maxAttempts: number;
}

const CUSTOM_VALUE = "__custom__";

// `service` on a job is who *requested* it — when the user clicks New
// Job, that's the dashboard. The kind tells the worker pool what to
// pick up; service is just the producer tag. Kept distinct from the
// MQTT-triggered path in gr26's OnShelterBatchReceived which sets
// service="gr26".
const REQUESTER_SERVICE = "dashboard";

const PRESETS: Preset[] = [
  {
    kind: "gr26.ingest_batch",
    description: "Ingest a specific parquet by file_ulid.",
    params: { vehicle_id: "gr26", file_ulid: "" },
    maxAttempts: 3,
  },
  {
    kind: "gr26.ingest_latest_batch",
    description:
      "Find the most-recently-uploaded parquet for a vehicle and ingest it inline.",
    params: { vehicle_id: "gr26" },
    maxAttempts: 3,
  },
  {
    kind: "gr26.ingest_all_batches",
    description:
      "Fan-out: enqueue an ingest_batch for every parquet uploaded in the last N hours. Set reingest=true to also re-process files that were already ingested.",
    params: { vehicle_id: "gr26", hours: 24, reingest: false },
    maxAttempts: 1,
  },
];

interface EnqueueJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnqueued?: (jobId: string) => void;
}

export function EnqueueJobDialog({
  open,
  onOpenChange,
  onEnqueued,
}: EnqueueJobDialogProps) {
  const navigate = useNavigate();
  const [presetValue, setPresetValue] = useState<string>(PRESETS[0].kind);
  const [kind, setKind] = useState("");
  const [service, setService] = useState(REQUESTER_SERVICE);
  const [paramsText, setParamsText] = useState("{}");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [priority, setPriority] = useState("0");
  const [maxAttempts, setMaxAttempts] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [paramsError, setParamsError] = useState<string | null>(null);

  // Apply a preset whenever it's picked (or on first open). "Custom"
  // wipes the kind input but leaves the rest so users can tweak from
  // a copied-over template.
  useEffect(() => {
    if (!open) return;
    const p = PRESETS.find((x) => x.kind === presetValue);
    if (!p) {
      // custom — leave fields, just clear kind so the user notices
      setKind("");
      return;
    }
    setKind(p.kind);
    setService(REQUESTER_SERVICE);
    setParamsText(JSON.stringify(p.params, null, 2));
    setMaxAttempts(String(p.maxAttempts));
    setParamsError(null);
  }, [presetValue, open]);

  const activePreset = PRESETS.find((p) => p.kind === presetValue);

  const submit = async () => {
    if (!kind.trim()) {
      notify.error("kind is required");
      return;
    }
    let params: unknown;
    try {
      params = paramsText.trim() ? JSON.parse(paramsText) : null;
      setParamsError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setParamsError(msg);
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        kind: kind.trim(),
        max_attempts: Number(maxAttempts) || 1,
        priority: Number(priority) || 0,
      };
      if (service.trim()) body.service = service.trim();
      if (idempotencyKey.trim()) body.idempotency_key = idempotencyKey.trim();
      if (params !== null) body.params = params;

      const r = await axios.post(`${BACKEND_URL}/foreman/jobs`, body, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
        },
      });
      const job = r.data.data;
      notify.success(`Enqueued ${job.id}`);
      onOpenChange(false);
      onEnqueued?.(job.id);
      navigate(`/jobs/${job.id}`);
    } catch (e) {
      // Foreman returns 409 with { conflict: true, job: ... } when the
      // idempotency key collides. Axios surfaces it as an error.
      const raw = axios.isAxiosError(e) ? e.response?.data?.data : undefined;
      if (raw?.conflict && raw?.job?.id) {
        notify.error(`Already enqueued: ${raw.job.id}`);
        onOpenChange(false);
        navigate(`/jobs/${raw.job.id}`);
        return;
      }
      notify.error(getAxiosErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New Job</DialogTitle>
          <DialogDescription>
            Enqueue a job in foreman. Pick a preset for a templated params
            skeleton, or "Custom" to fill in any kind by hand.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Preset</Label>
            <Select value={presetValue} onValueChange={setPresetValue}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESETS.map((p) => (
                  <SelectItem key={p.kind} value={p.kind}>
                    {p.kind}
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM_VALUE}>Custom</SelectItem>
              </SelectContent>
            </Select>
            {activePreset && (
              <div className="text-xs text-muted-foreground">
                {activePreset.description}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Kind</Label>
              <Input
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                placeholder="e.g. gr26.ingest_batch"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Service</Label>
              <Input
                value={service}
                onChange={(e) => setService(e.target.value)}
                placeholder="e.g. gr26"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Params (JSON)</Label>
            <Textarea
              value={paramsText}
              onChange={(e) => {
                setParamsText(e.target.value);
                setParamsError(null);
              }}
              placeholder='{ "vehicle_id": "gr26" }'
              rows={6}
              className="font-mono text-xs"
            />
            {paramsError && (
              <div className="text-xs text-red-400">{paramsError}</div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Priority</Label>
              <Input
                type="number"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Max attempts</Label>
              <Input
                type="number"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Idempotency key</Label>
              <Input
                value={idempotencyKey}
                onChange={(e) => setIdempotencyKey(e.target.value)}
                placeholder="optional"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Enqueueing…" : "Enqueue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

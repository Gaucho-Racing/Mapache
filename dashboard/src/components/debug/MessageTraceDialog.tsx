import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { BACKEND_URL } from "@/consts/config";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";

interface CANField {
  name: string;
  offset: number;
  size: number;
  sign: "signed" | "unsigned";
  endian: "big" | "little";
  bytes: string;
  raw_value: number;
  signal_names: string[];
}

interface CANSignal {
  id: string;
  timestamp: number;
  vehicle_id: string;
  name: string;
  value: number;
  raw_value: number;
  produced_at: string;
  created_at: string;
}

interface CANMessage {
  id: string;
  vehicle_id: string;
  node_id: string;
  timestamp: number;
  can_id: number;
  bytes: string;
  upload_key: number;
  metadata?: { status: string; note?: string };
  produced_at: string;
  created_at: string;
  fields: CANField[] | null;
  signals: CANSignal[];
}

interface Props {
  // signalId is the streamed mapache.Signal id; the endpoint joins to
  // gr26_can_signal to find the originating frame and returns the same
  // shape as /gr26/messages/:id.
  signalId: string | null;
  vehicleType: string;
  highlightSignal?: string;
  onOpenChange: (open: boolean) => void;
}

// Tailwind palette cycled per field so adjacent fields are visually
// distinct. Numerals are arbitrary; just need enough variety.
const FIELD_COLORS = [
  "bg-pink-500 text-white",
  "bg-purple-500 text-white",
  "bg-cyan-500 text-black",
  "bg-amber-400 text-black",
  "bg-emerald-500 text-black",
  "bg-blue-500 text-white",
  "bg-rose-500 text-white",
  "bg-lime-400 text-black",
];

// Full local datetime with millisecond precision: "5/21/2026, 1:20:10.454 AM"
function formatFullLocal(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString();
  const time = d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const ms = d.getMilliseconds().toString().padStart(3, "0");
  return `${date}, ${time.replace(/(\d+:\d+:\d+)/, `$1.${ms}`)}`;
}

function formatLatency(ms: number): string {
  if (Math.abs(ms) < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export default function MessageTraceDialog({
  signalId,
  vehicleType,
  highlightSignal,
  onOpenChange,
}: Props) {
  const [data, setData] = useState<CANMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!signalId) {
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    axios
      .get(`${BACKEND_URL}/${vehicleType}/signals/${signalId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
        },
      })
      .then((res) => {
        if (cancelled) return;
        // kerbecs wraps every service response in
        // { status, ping, ..., data: <actual payload> }, so the CAN
        // message lives one level deep.
        setData(res.data.data as CANMessage);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err.response?.data?.error ?? err.message ?? "Failed to load trace",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [signalId, vehicleType]);

  // Map every byte offset to the field that owns it (if any) so the hex
  // grid can color bytes by field with a single lookup.
  const byteToField = useMemo(() => {
    const map = new Map<number, number>();
    if (!data?.fields) return map;
    data.fields.forEach((f, idx) => {
      for (let i = 0; i < f.size; i++) {
        map.set(f.offset + i, idx);
      }
    });
    return map;
  }, [data]);

  const totalBytes = data ? Math.floor(data.bytes.length / 2) : 0;

  return (
    <Dialog open={signalId != null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>CAN Frame Trace</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading trace...
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>{error}</div>
          </div>
        )}

        {data && (
          <div className="flex flex-col gap-4">
            <Card className="p-3">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <Row label="ID" value={data.id} mono />
                <Row label="Status" value={data.metadata?.status ?? "—"} />
                <Row
                  label="Vehicle"
                  value={`${data.vehicle_id}`}
                />
                <Row label="Node" value={data.node_id} mono />
                <Row
                  label="CAN ID"
                  value={`0x${data.can_id.toString(16).toUpperCase()}`}
                  mono
                />
                <Row label="Bytes" value={`${totalBytes}`} mono />
                <Row
                  label="Produced at"
                  value={formatFullLocal(data.produced_at)}
                  mono
                />
                <Row
                  label="Ingest latency"
                  value={formatLatency(
                    new Date(data.created_at).getTime() -
                      new Date(data.produced_at).getTime(),
                  )}
                  mono
                />
                <Row label="Upload key" value={String(data.upload_key)} mono />
              </div>
              {data.metadata?.note && (
                <div className="mt-2 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                  {data.metadata.note}
                </div>
              )}
            </Card>

            <div>
              <div className="mb-1 text-xs font-medium text-muted-foreground">
                Bytes
              </div>
              <Card className="p-3">
                <div className="flex flex-wrap gap-1 font-mono text-sm">
                  {Array.from({ length: totalBytes }).map((_, i) => {
                    const hex = data.bytes
                      .slice(i * 2, i * 2 + 2)
                      .toUpperCase();
                    const fieldIdx = byteToField.get(i);
                    const cls =
                      fieldIdx != null
                        ? FIELD_COLORS[fieldIdx % FIELD_COLORS.length]
                        : "bg-muted text-muted-foreground";
                    return (
                      <div
                        key={i}
                        className={`flex flex-col items-center rounded px-1.5 py-1 ${cls}`}
                      >
                        <span className="text-[10px] opacity-60">{i}</span>
                        <span>{hex}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            {data.fields && data.fields.length > 0 && (
              <div>
                <div className="mb-1 text-xs font-medium text-muted-foreground">
                  Fields
                </div>
                <Card className="overflow-hidden p-0">
                  <div className="divide-y">
                    {data.fields.map((f, idx) => {
                      const cls =
                        FIELD_COLORS[idx % FIELD_COLORS.length].split(" ")[0];
                      return (
                        <div
                          key={idx}
                          className="flex flex-col gap-1 p-3 text-xs"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-block h-3 w-3 rounded ${cls}`}
                              />
                              <span className="font-mono font-medium">
                                {f.name}
                              </span>
                            </div>
                            <span className="font-mono text-muted-foreground">
                              raw {f.raw_value} · 0x
                              {f.bytes.toUpperCase() || "00"}
                            </span>
                          </div>
                          <div className="ml-5 flex flex-wrap gap-x-4 gap-y-0.5 text-muted-foreground">
                            <span>
                              offset {f.offset} · {f.size} byte
                              {f.size === 1 ? "" : "s"}
                            </span>
                            <span>
                              {f.sign} · {f.endian}
                            </span>
                            {f.signal_names.length > 0 && (
                              <span className="font-mono">
                                → {f.signal_names.join(", ")}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            )}

            <div>
              <div className="mb-1 text-xs font-medium text-muted-foreground">
                Signals from this frame
              </div>
              <Card className="overflow-hidden p-0">
                {data.signals.length === 0 ? (
                  <div className="p-3 text-xs text-muted-foreground">
                    None linked.
                  </div>
                ) : (
                  <div className="divide-y">
                    {data.signals.map((s) => {
                      const isHighlight = s.name === highlightSignal;
                      return (
                        <div
                          key={s.id}
                          className={`flex items-center justify-between gap-4 p-3 text-xs ${isHighlight ? "bg-pink-500/20" : ""}`}
                        >
                          <div className="flex min-w-0 flex-col">
                            <span className="font-mono font-medium">
                              {s.name}
                            </span>
                            <span className="truncate font-mono text-[10px] text-muted-foreground">
                              {s.id}
                            </span>
                          </div>
                          <span className="whitespace-nowrap font-mono text-muted-foreground">
                            {s.value} · raw {s.raw_value}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono" : ""}>{value}</span>
    </>
  );
}

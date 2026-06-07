import { Badge } from "@/components/ui/badge";

// Covers both job-level statuses (pending / active / succeeded / failed
// / cancelled) and the run-level ones surfaced in per-attempt history
// views (running / abandoned). Same color family across the boundary.
const STATUS_STYLES: Record<string, string> = {
  pending: "bg-neutral-700 text-neutral-200 hover:bg-neutral-700",
  active: "bg-blue-600 text-white hover:bg-blue-600",
  running: "bg-blue-600 text-white hover:bg-blue-600",
  succeeded: "bg-green-600 text-white hover:bg-green-600",
  failed: "bg-red-600 text-white hover:bg-red-600",
  cancelled: "bg-amber-600 text-white hover:bg-amber-600",
  abandoned: "bg-amber-600 text-white hover:bg-amber-600",
};

export function JobStatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-neutral-700 text-neutral-200";
  return <Badge className={style}>{status}</Badge>;
}

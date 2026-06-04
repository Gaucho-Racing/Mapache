import { Badge } from "@/components/ui/badge";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-neutral-700 text-neutral-200 hover:bg-neutral-700",
  running: "bg-blue-600 text-white hover:bg-blue-600",
  succeeded: "bg-green-600 text-white hover:bg-green-600",
  failed: "bg-red-600 text-white hover:bg-red-600",
  cancelled: "bg-amber-600 text-white hover:bg-amber-600",
};

export function JobStatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-neutral-700 text-neutral-200";
  return <Badge className={style}>{status}</Badge>;
}

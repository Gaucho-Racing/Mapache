import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { JobStatusBadge } from "@/components/jobs/JobStatusBadge";
import {
  elapsedMs,
  formatDurationMs,
  useJobStream,
  useTickingNow,
} from "@/lib/job-stream";
import { Job, isTerminalStatus } from "@/models/job";
import { useNavigate } from "react-router-dom";

export function RunningJobCard({ job: initial }: { job: Job }) {
  const navigate = useNavigate();
  const { job: streamed } = useJobStream(initial.id, initial);
  const job = streamed ?? initial;
  const active = !isTerminalStatus(job.status);
  const now = useTickingNow(500, active);
  const elapsed = elapsedMs(job, now);
  const pct =
    job.progress_total > 0
      ? (job.progress_current / job.progress_total) * 100
      : 0;

  return (
    <Card
      className="cursor-pointer p-4 transition-all duration-150 hover:bg-card"
      onClick={() => navigate(`/jobs/${job.id}`)}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate text-sm font-semibold">{job.kind}</div>
          <JobStatusBadge status={job.status} />
        </div>
        <Progress value={pct} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {job.progress_current.toLocaleString()} /{" "}
            {job.progress_total.toLocaleString()}
          </span>
          <span>{pct.toFixed(1)}%</span>
        </div>
        {job.progress_message && (
          <div className="truncate text-xs text-muted-foreground">
            {job.progress_message}
          </div>
        )}
        <Separator className="my-1" />
        <div className="grid grid-cols-[80px_1fr] gap-y-1 text-xs">
          <span className="text-muted-foreground">elapsed</span>
          <span className="text-right font-mono">
            {formatDurationMs(elapsed)}
          </span>
          <span className="text-muted-foreground">attempt</span>
          <span className="text-right font-mono">
            {job.attempt}/{job.max_attempts}
          </span>
          <span className="text-muted-foreground">worker</span>
          <span className="truncate text-right font-mono">
            {job.worker_id || "—"}
          </span>
        </div>
      </div>
    </Card>
  );
}

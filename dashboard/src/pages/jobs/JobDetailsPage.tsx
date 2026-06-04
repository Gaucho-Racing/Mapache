import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { JobStatusBadge } from "@/components/jobs/JobStatusBadge";
import { LoadingComponent } from "@/components/Loading";
import {
  elapsedMs,
  formatDurationMs,
  useJobStream,
  useTickingNow,
} from "@/lib/job-stream";
import { Job, isTerminalStatus } from "@/models/job";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

function JobDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { job, error } = useJobStream(id);

  if (!job) {
    return (
      <Layout activeTab="jobs" headerTitle="Job">
        {error ? (
          <Card className="border border-red-700 p-4">
            <div className="text-sm text-red-200">{error}</div>
          </Card>
        ) : (
          <LoadingComponent />
        )}
      </Layout>
    );
  }

  const active = !isTerminalStatus(job.status);
  return (
    <Layout activeTab="jobs" headerTitle="Job Details">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate("/jobs")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Jobs
          </Button>
        </div>

        <JobHeader job={job} active={active} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <OverviewCard job={job} active={active} />
          <ProgressCard job={job} />
        </div>

        {job.params && Object.keys(job.params).length > 0 && (
          <JsonCard title="Params" data={job.params} />
        )}

        {job.result && Object.keys(job.result).length > 0 && (
          <JsonCard title="Result" data={job.result} />
        )}

        {job.error && (
          <Card className="border border-red-700 p-4">
            <h4 className="mb-2 text-red-400">Error</h4>
            <Separator className="mb-3" />
            <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs text-red-200">
              {job.error}
            </pre>
          </Card>
        )}
      </div>
    </Layout>
  );
}

function JobHeader({ job, active }: { job: Job; active: boolean }) {
  const now = useTickingNow(500, active);
  const elapsed = elapsedMs(job, now);
  return (
    <Card className="p-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold">{job.kind}</h2>
          <JobStatusBadge status={job.status} />
          {active ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
              </span>
              live
            </span>
          ) : null}
        </div>
        <div className="flex items-baseline gap-4">
          <div className="font-mono text-xs text-muted-foreground">
            {job.id}
          </div>
          {job.started_at && (
            <div className="ml-auto flex items-baseline gap-2">
              <span className="text-xs text-muted-foreground">
                {active ? "elapsed" : "duration"}
              </span>
              <span className="font-mono text-lg">
                {formatDurationMs(elapsed)}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function OverviewCard({ job, active }: { job: Job; active: boolean }) {
  const now = useTickingNow(500, active);
  return (
    <Card className="p-4">
      <h4 className="mb-2">Overview</h4>
      <Separator className="mb-3" />
      <DefList
        items={[
          ["Queue", job.queue],
          ["Service", job.service || "—"],
          ["Priority", String(job.priority)],
          ["Attempt", `${job.attempt} / ${job.max_attempts}`],
          ["Worker", job.worker_id || "—"],
          ["Idempotency key", job.idempotency_key || "—"],
          ["Scheduled", fmtTime(job.scheduled_at)],
          ["Created", fmtTime(job.created_at)],
          ["Started", fmtTime(job.started_at)],
          ["Finished", fmtTime(job.finished_at)],
          ["Lease expires", fmtTime(job.lease_expires_at)],
          [
            active ? "Elapsed" : "Duration",
            job.started_at ? formatDurationMs(elapsedMs(job, now)) : "—",
          ],
        ]}
      />
    </Card>
  );
}

function ProgressCard({ job }: { job: Job }) {
  const pct =
    job.progress_total > 0
      ? (job.progress_current / job.progress_total) * 100
      : 0;
  return (
    <Card className="p-4">
      <h4 className="mb-2">Progress</h4>
      <Separator className="mb-3" />
      {job.progress_total > 0 ? (
        <div className="flex flex-col gap-2">
          <Progress value={pct} />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              {job.progress_current.toLocaleString()} /{" "}
              {job.progress_total.toLocaleString()}
            </span>
            <span>{pct.toFixed(1)}%</span>
          </div>
          {job.progress_message && (
            <div className="text-sm text-muted-foreground">
              {job.progress_message}
            </div>
          )}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">
          No progress reported.
        </div>
      )}
    </Card>
  );
}

function DefList({ items }: { items: [string, string][] }) {
  return (
    <dl className="grid grid-cols-[140px_1fr] gap-y-1.5 text-sm">
      {items.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="break-all font-mono text-xs">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function JsonCard({ title, data }: { title: string; data: unknown }) {
  return (
    <Card className="p-4">
      <h4 className="mb-2">{title}</h4>
      <Separator className="mb-3" />
      <pre className="overflow-x-auto rounded bg-neutral-950 p-3 font-mono text-xs">
        {JSON.stringify(data, null, 2)}
      </pre>
    </Card>
  );
}

function fmtTime(s?: string): string {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default JobDetailsPage;

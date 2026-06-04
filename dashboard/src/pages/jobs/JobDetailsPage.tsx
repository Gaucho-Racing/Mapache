import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { JobStatusBadge } from "@/components/jobs/JobStatusBadge";
import { LoadingComponent } from "@/components/Loading";
import { BACKEND_URL } from "@/consts/config";
import { notify } from "@/lib/notify";
import { getAxiosErrorMessage } from "@/lib/axios-error-handler";
import { Job, initJob, isTerminalStatus } from "@/models/job";
import axios from "axios";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const POLL_INTERVAL_MS = 2000;

function JobDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job>(initJob);
  const [loaded, setLoaded] = useState(false);

  const fetchJob = async (silent = false) => {
    if (!id) return;
    try {
      const r = await axios.get(`${BACKEND_URL}/foreman/jobs/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
        },
      });
      setJob(r.data.data as Job);
      setLoaded(true);
    } catch (e) {
      if (!silent) {
        notify.error(getAxiosErrorMessage(e));
        navigate("/jobs");
      }
    }
  };

  useEffect(() => {
    fetchJob();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Live-refresh while the job is still moving. Stops the moment status
  // flips to a terminal state.
  useEffect(() => {
    if (!loaded || isTerminalStatus(job.status)) return;
    const t = setInterval(() => fetchJob(true), POLL_INTERVAL_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, job.status, id]);

  if (!loaded) {
    return (
      <Layout activeTab="jobs" headerTitle="Job">
        <LoadingComponent />
      </Layout>
    );
  }

  const pct =
    job.progress_total > 0
      ? (job.progress_current / job.progress_total) * 100
      : 0;

  return (
    <Layout activeTab="jobs" headerTitle="Job Details">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate("/jobs")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Jobs
          </Button>
          <Button variant="outline" onClick={() => fetchJob()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <Card className="p-4">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold">{job.kind}</h2>
              <JobStatusBadge status={job.status} />
              {!isTerminalStatus(job.status) && (
                <span className="text-xs text-muted-foreground">
                  live • refreshing every {POLL_INTERVAL_MS / 1000}s
                </span>
              )}
            </div>
            <div className="font-mono text-xs text-muted-foreground">
              {job.id}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
                ["Duration", formatDuration(job)],
              ]}
            />
          </Card>

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

function formatDuration(job: Job): string {
  if (!job.started_at) return "—";
  const end = job.finished_at
    ? new Date(job.finished_at).getTime()
    : Date.now();
  const start = new Date(job.started_at).getTime();
  const ms = end - start;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)}s`;
  const m = Math.floor(ms / 60_000);
  const s = ((ms % 60_000) / 1000).toFixed(1);
  return `${m}m ${s}s`;
}

export default JobDetailsPage;

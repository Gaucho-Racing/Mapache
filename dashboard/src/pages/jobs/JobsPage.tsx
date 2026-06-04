import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BACKEND_URL } from "@/consts/config";
import { notify } from "@/lib/notify";
import { getAxiosErrorMessage } from "@/lib/axios-error-handler";
import {
  formatDurationMs,
  formatCount,
  elapsedMs,
  PROGRESS_GRADIENT_CLASS,
} from "@/lib/job-stream";
import { Job, JOB_STATUSES, isTerminalStatus } from "@/models/job";
import { EnqueueJobDialog } from "@/components/jobs/EnqueueJobDialog";
import { JobStatusBadge } from "@/components/jobs/JobStatusBadge";
import { RunningJobCard } from "@/components/jobs/RunningJobCard";
import axios from "axios";
import { Plus, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

const PAGE_SIZE = 50;
const POLL_INTERVAL_MS = 5000;

function JobsPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [kind, setKind] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [paginated, setPaginated] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchJobs = useCallback(
    async (cursor?: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("limit", String(PAGE_SIZE));
        if (status) params.set("status", status);
        if (kind.trim()) params.set("kind", kind.trim());
        if (serviceName.trim()) params.set("service", serviceName.trim());
        if (cursor) params.set("cursor", cursor);
        const r = await axios.get(
          `${BACKEND_URL}/foreman/jobs?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
            },
          },
        );
        const newJobs = (r.data.data as Job[]) ?? [];
        setJobs((prev) => (cursor ? [...prev, ...newJobs] : newJobs));
        setHasMore(newJobs.length === PAGE_SIZE);
      } catch (e) {
        notify.error(getAxiosErrorMessage(e));
      } finally {
        setLoading(false);
      }
    },
    [status, kind, serviceName],
  );

  // Filter changes reset pagination + reload from the top.
  useEffect(() => {
    setPaginated(false);
    fetchJobs();
  }, [fetchJobs]);

  // Per-card SSE streams (RunningJobCard) keep in-progress data fresh in
  // real-time, so we only poll the list to *discover* newly enqueued or
  // newly-running jobs. Skip while the user has paginated — refreshing
  // would blow away the appended pages, which is more annoying than a
  // stale list.
  useEffect(() => {
    if (paginated) return;
    if (!jobs.some((j) => !isTerminalStatus(j.status))) return;
    const t = setInterval(() => fetchJobs(), POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [jobs, paginated, fetchJobs]);

  const handleLoadMore = () => {
    const last = jobs[jobs.length - 1];
    if (!last) return;
    setPaginated(true);
    fetchJobs(last.id);
  };

  // Cards at the top show only actively-running jobs. Pending jobs live
  // in the table below — they have no progress to draw and a row reads
  // better than a near-empty card.
  const runningJobs = useMemo(
    () => jobs.filter((j) => j.status === "running"),
    [jobs],
  );

  return (
    <Layout activeTab="jobs" headerTitle="Jobs">
      <div className="flex flex-col gap-4">
        <FilterBar
          status={status}
          setStatus={setStatus}
          kind={kind}
          setKind={setKind}
          serviceName={serviceName}
          setServiceName={setServiceName}
          loading={loading}
          onRefresh={() => {
            setPaginated(false);
            fetchJobs();
          }}
          onNew={() => setDialogOpen(true)}
        />

        <EnqueueJobDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onEnqueued={() => {
            setPaginated(false);
            fetchJobs();
          }}
        />

        {runningJobs.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Running ({runningJobs.length})
            </h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {runningJobs.map((j) => (
                <RunningJobCard key={j.id} job={j} />
              ))}
            </div>
          </div>
        )}

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Attempt</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.length === 0 && !loading && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No jobs found
                  </TableCell>
                </TableRow>
              )}
              {jobs.map((j) => (
                <JobRow
                  key={j.id}
                  job={j}
                  onClick={() => navigate(`/jobs/${j.id}`)}
                />
              ))}
            </TableBody>
          </Table>
        </Card>

        {hasMore && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={handleLoadMore}
              disabled={loading}
            >
              Load more
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}

interface FilterBarProps {
  status: string;
  setStatus: (s: string) => void;
  kind: string;
  setKind: (s: string) => void;
  serviceName: string;
  setServiceName: (s: string) => void;
  loading: boolean;
  onRefresh: () => void;
  onNew: () => void;
}

function FilterBar(props: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Status</label>
          <Select
            value={props.status || "all"}
            onValueChange={(v) => props.setStatus(v === "all" ? "" : v)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {JOB_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Kind</label>
          <Input
            value={props.kind}
            onChange={(e) => props.setKind(e.target.value)}
            placeholder="e.g. gr26.ingest_batch"
            className="w-[260px]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Service</label>
          <Input
            value={props.serviceName}
            onChange={(e) => props.setServiceName(e.target.value)}
            placeholder="e.g. gr26"
            className="w-[160px]"
          />
        </div>
        <Button
          variant="outline"
          onClick={props.onRefresh}
          disabled={props.loading}
        >
          <RefreshCw
            className={`h-4 w-4 ${props.loading ? "animate-spin" : ""}`}
          />
        </Button>
      </div>
      <Button onClick={props.onNew}>
        <Plus className="mr-2 h-4 w-4" />
        New Job
      </Button>
    </div>
  );
}

function JobRow({ job, onClick }: { job: Job; onClick: () => void }) {
  const pct =
    job.progress_total > 0
      ? (job.progress_current / job.progress_total) * 100
      : 0;
  return (
    <TableRow className="cursor-pointer" onClick={onClick}>
      <TableCell className="font-mono text-xs">{job.id.slice(-12)}</TableCell>
      <TableCell>{job.kind}</TableCell>
      <TableCell>
        <JobStatusBadge status={job.status} />
      </TableCell>
      <TableCell>
        {job.attempt}/{job.max_attempts}
      </TableCell>
      <TableCell className="w-[220px]">
        {job.progress_total > 0 ? (
          <div className="flex items-center gap-2">
            <Progress
              value={pct}
              className="h-1.5 w-24"
              indicatorClassName={
                isTerminalStatus(job.status)
                  ? "bg-white"
                  : PROGRESS_GRADIENT_CLASS
              }
            />
            <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
              {formatCount(job.progress_current)}/
              {formatCount(job.progress_total)}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-xs">
        {job.started_at ? formatDurationMs(elapsedMs(job, Date.now())) : "—"}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {new Date(job.created_at).toLocaleString()}
      </TableCell>
    </TableRow>
  );
}

export default JobsPage;

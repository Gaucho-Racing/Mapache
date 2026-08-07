import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { JobStatusBadge } from "@/components/jobs/JobStatusBadge";
import { BACKEND_URL } from "@/consts/config";
import { http, getAxiosErrorMessage } from "@/lib/http";
import { formatDurationMs, useTickingNow } from "@/lib/job-stream";
import { Run } from "@/models/job";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// JobRunsCard renders every attempt at a job, newest first.
//
// Foreman keeps per-attempt outcome on the Run, not the Job: job.result is
// reserved for the winning attempt and job.current_run is null once the job
// terminalizes. So a failed attempt's error and result — including partial
// -failure payloads from handlers that return bytes alongside an error — are
// only reachable through /jobs/:id/runs. Without this card they're invisible.
export function JobRunsCard({
  jobId,
  attemptCount,
  status,
}: {
  jobId: string;
  attemptCount: number;
  status: string;
}) {
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // User toggles win over the per-run default; keyed by run id so a refetch
  // (new attempt landing over SSE) doesn't reopen what the user collapsed.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const fetchRuns = useCallback(async () => {
    try {
      const r = await http.get(`${BACKEND_URL}/foreman/jobs/${jobId}/runs`);
      setRuns((r.data.data as Run[]) ?? []);
      setError(null);
    } catch (e) {
      setError(getAxiosErrorMessage(e));
    }
  }, [jobId]);

  // attemptCount / status come off the SSE-backed job, so a new attempt or a
  // terminal transition pulls the fresh run list without a poll of our own.
  useEffect(() => {
    void fetchRuns();
  }, [fetchRuns, attemptCount, status]);

  if (error) {
    return (
      <Card className="p-4">
        <h4 className="mb-2">Attempts</h4>
        <Separator className="mb-3" />
        <div className="text-sm text-red-200">{error}</div>
      </Card>
    );
  }

  if (!runs || runs.length === 0) {
    return (
      <Card className="p-4">
        <h4 className="mb-2">Attempts</h4>
        <Separator className="mb-3" />
        <div className="text-sm text-muted-foreground">
          {runs ? "No attempts yet." : "Loading attempts…"}
        </div>
      </Card>
    );
  }

  // Foreman returns attempt ASC; newest-first reads better here.
  const ordered = [...runs].sort((a, b) => b.attempt - a.attempt);
  const latest = ordered[0].attempt;

  return (
    <Card className="p-4">
      <h4 className="mb-2">Attempts ({runs.length})</h4>
      <Separator className="mb-3" />
      <div className="flex flex-col">
        {ordered.map((run, i) => (
          <RunRow
            key={run.id}
            run={run}
            first={i === 0}
            expanded={overrides[run.id] ?? defaultExpanded(run, latest)}
            onToggle={() =>
              setOverrides((prev) => ({
                ...prev,
                [run.id]: !(prev[run.id] ?? defaultExpanded(run, latest)),
              }))
            }
          />
        ))}
      </div>
    </Card>
  );
}

// Anything that didn't succeed is why you opened this card, so it starts
// open — as does the latest attempt, which is the usual first thing read.
function defaultExpanded(run: Run, latestAttempt: number): boolean {
  return run.status !== "succeeded" || run.attempt === latestAttempt;
}

function RunRow({
  run,
  first,
  expanded,
  onToggle,
}: {
  run: Run;
  first: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const running = run.status === "running";
  const now = useTickingNow(500, running);
  const started = new Date(run.started_at).getTime();
  const end = run.finished_at ? new Date(run.finished_at).getTime() : now;
  const duration = isNaN(started) ? -1 : end - started;

  const hasResult = run.result && Object.keys(run.result).length > 0;
  const hasProgress = run.progress_total > 0;

  return (
    <div className={first ? "" : "border-t border-neutral-800"}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 py-2 text-left hover:bg-neutral-900"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="w-8 shrink-0 font-mono text-xs text-muted-foreground">
          #{run.attempt}
        </span>
        <JobStatusBadge status={run.status} />
        <span className="truncate font-mono text-xs text-muted-foreground">
          {run.worker_id || "—"}
        </span>
        <span className="ml-auto shrink-0 font-mono text-xs">
          {formatDurationMs(duration)}
        </span>
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 pb-3 pl-7 pr-1">
          <dl className="grid grid-cols-[100px_1fr] gap-y-1 text-xs">
            <dt className="text-muted-foreground">Run id</dt>
            <dd className="break-all font-mono">{run.id}</dd>
            <dt className="text-muted-foreground">Started</dt>
            <dd className="font-mono">{fmtTime(run.started_at)}</dd>
            <dt className="text-muted-foreground">Finished</dt>
            <dd className="font-mono">{fmtTime(run.finished_at)}</dd>
          </dl>

          {hasProgress && (
            <div className="text-xs text-muted-foreground">
              progress {run.progress_current.toLocaleString()} /{" "}
              {run.progress_total.toLocaleString()}
              {run.progress_message ? ` — ${run.progress_message}` : ""}
            </div>
          )}

          {run.error && (
            <div>
              <div className="mb-1 text-xs text-red-400">Error</div>
              <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-neutral-950 p-3 font-mono text-xs text-red-200">
                {run.error}
              </pre>
            </div>
          )}

          {hasResult && (
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Result</div>
              <pre className="overflow-x-auto rounded bg-neutral-950 p-3 font-mono text-xs">
                {JSON.stringify(run.result, null, 2)}
              </pre>
            </div>
          )}

          {!run.error && !hasResult && !hasProgress && (
            <div className="text-xs text-muted-foreground">
              No error, result, or progress reported for this attempt.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function fmtTime(s?: string): string {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

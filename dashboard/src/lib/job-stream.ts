import { useEffect, useRef, useState } from "react";
import { BACKEND_URL } from "@/consts/config";
import { Job, isTerminalStatus } from "@/models/job";

// useJobStream opens an SSE connection to foreman's /events/:id endpoint
// and keeps the returned job in sync as the server pushes updates. The
// stream auto-closes once the job reaches a terminal status, mirroring
// the server-side behaviour in foreman/api/sse.go.
//
// `initial` (optional) seeds state before the first event lands so cards
// rendered from a list fetch don't flash empty. Passing it does not
// re-open the stream if it doesn't change — only jobId is a dep.
export function useJobStream(
  jobId: string | undefined,
  initial?: Job,
): { job: Job | null; error: string | null } {
  const [job, setJob] = useState<Job | null>(initial ?? null);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!jobId) return;
    setError(null);

    const es = new EventSource(`${BACKEND_URL}/foreman/events/${jobId}`);
    esRef.current = es;

    const onJob = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as Job;
        setJob(data);
        if (isTerminalStatus(data.status)) {
          es.close();
          esRef.current = null;
        }
      } catch {
        setError("malformed event");
      }
    };
    es.addEventListener("job", onJob);

    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) {
        setError("stream closed");
      }
      // Otherwise EventSource is auto-reconnecting; let it do its thing.
    };

    return () => {
      es.removeEventListener("job", onJob);
      es.close();
      esRef.current = null;
    };
  }, [jobId]);

  return { job, error };
}

// useTickingNow returns a Date.now() value that refreshes on the given
// interval while `active` is true. Use it to drive live elapsed-time
// displays without coupling to the SSE cadence.
export function useTickingNow(intervalMs: number, active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs, active]);
  return now;
}

export function formatDurationMs(ms: number): string {
  if (ms < 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  const s = ((ms % 60_000) / 1000).toFixed(1);
  return `${m}m ${s}s`;
}

// elapsedMs computes the time the job has been running. Falls back to
// `now` when the job hasn't reported a finished_at yet, so the display
// keeps ticking while the job is live.
export function elapsedMs(job: Job, now: number): number {
  if (!job.started_at) return 0;
  const start = new Date(job.started_at).getTime();
  const end = job.finished_at ? new Date(job.finished_at).getTime() : now;
  return end - start;
}

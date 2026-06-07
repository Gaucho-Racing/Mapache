// Job / Run / Schedule shapes from Foreman v2 (github.com/gaucho-racing/Foreman).
//
// The Job is the durable definition + outcome of one unit of work. Each
// time a worker claims it, Foreman writes a separate Run row capturing
// that attempt's state — worker id, lease, progress, terminal error or
// result. Most live fields the dashboard surfaces (worker_id, progress,
// lease_expires_at) live on the in-flight Run, not on the parent Job.
//
// /foreman/jobs?include=current_run and the SSE stream at
// /foreman/events/:id both return jobWithRun — the Job plus an optional
// current_run snapshot — so producers can render live progress without
// a second fetch.

export type JobStatus =
  | "pending"
  | "active"
  | "succeeded"
  | "failed"
  | "cancelled";

export type RunStatus = "running" | "succeeded" | "failed" | "abandoned";

export interface Run {
  id: string;
  job_id: string;
  attempt: number;
  worker_id: string;
  status: RunStatus;
  lease_expires_at?: string;
  progress_current: number;
  progress_total: number;
  progress_message?: string;
  result?: Record<string, unknown>;
  error?: string;
  started_at: string;
  finished_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  kind: string;
  queue: string;
  service: string;
  status: JobStatus;
  idempotency_key?: string;
  params?: Record<string, unknown>;
  // Result is denormed from the winning Run onto the Job once it
  // succeeds. Failures live as `error` (also denormed).
  result?: Record<string, unknown>;
  error?: string;
  priority: number;
  attempt_count: number;
  max_attempts: number;
  cancel_requested: boolean;
  scheduled_at?: string;
  enqueued_at: string;
  started_at?: string;
  completed_at?: string;
  updated_at: string;
  // Populated by /jobs?include=current_run, /jobs/:id?include=current_run,
  // and SSE events at /events/:id. Always null on terminal jobs (the
  // run has finished). Workers reading these calls in code, not from
  // the dashboard, will see this as `null` and should ignore it.
  current_run?: Run | null;
}

export const initJob: Job = {
  id: "",
  kind: "",
  queue: "",
  service: "",
  status: "pending",
  priority: 0,
  attempt_count: 0,
  max_attempts: 0,
  cancel_requested: false,
  enqueued_at: "",
  updated_at: "",
};

export const JOB_STATUSES: JobStatus[] = [
  "pending",
  "active",
  "succeeded",
  "failed",
  "cancelled",
];

export const isTerminalStatus = (s: string): boolean =>
  s === "succeeded" || s === "failed" || s === "cancelled";

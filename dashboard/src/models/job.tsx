export type JobStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface Job {
  id: string;
  kind: string;
  queue: string;
  service: string;
  status: JobStatus;
  idempotency_key?: string;
  params?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  priority: number;
  progress_current: number;
  progress_total: number;
  progress_message?: string;
  attempt: number;
  max_attempts: number;
  worker_id?: string;
  lease_expires_at?: string;
  cancel_requested: boolean;
  scheduled_at?: string;
  started_at?: string;
  finished_at?: string;
  created_at: string;
  updated_at: string;
}

export const initJob: Job = {
  id: "",
  kind: "",
  queue: "",
  service: "",
  status: "pending",
  priority: 0,
  progress_current: 0,
  progress_total: 0,
  attempt: 0,
  max_attempts: 0,
  cancel_requested: false,
  created_at: "",
  updated_at: "",
};

export const JOB_STATUSES: JobStatus[] = [
  "pending",
  "running",
  "succeeded",
  "failed",
  "cancelled",
];

export const isTerminalStatus = (s: string): boolean =>
  s === "succeeded" || s === "failed" || s === "cancelled";

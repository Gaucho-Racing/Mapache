// Package foreman is a single-file Go client for the Foreman REST API.
//
// Drop this file into your project — no third-party dependencies, only
// the standard library. Rename the package if you need to: the file
// declares `package foreman`, change it to whatever matches the
// directory you placed it in.
//
// # Quick start
//
//	c := foreman.New("http://foreman:7011")
//
//	// Producer side.
//	res, err := c.Enqueue(ctx, foreman.EnqueueRequest{
//	    Kind:           "send-email",
//	    Params:         json.RawMessage(`{"to":"x@y.com"}`),
//	    IdempotencyKey: foreman.Ptr("email-42"),
//	    MaxAttempts:    3,
//	})
//
//	// Worker side.
//	claimed, err := c.Claim(ctx, foreman.ClaimRequest{
//	    Kinds: []string{"send-email"}, WorkerID: "worker-1", LeaseSec: 60,
//	})
//	if claimed == nil { /* queue empty */ }
//	defer c.Heartbeat(ctx, claimed.Run.ID, foreman.HeartbeatRequest{
//	    WorkerID: "worker-1",
//	})
//
// # Errors
//
// Non-2xx responses surface as *HTTPError, whose message is the
// server's `{"error": "..."}` field. A 409 on Enqueue is folded into a
// non-error EnqueueResult{Created: false, Job: existing} so callers
// don't have to special-case idempotent re-sends.
//
// # No-op mode
//
// Passing an empty Endpoint to New (or constructing Client{} with no
// Endpoint) makes every method a no-op success. Handy for opt-in
// deployments where Foreman is configured per-environment.
package foreman

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// ---------- Types ----------

// Job is the definition + lifecycle state of one queued unit of work.
type Job struct {
	ID              string          `json:"id"`
	Kind            string          `json:"kind"`
	Queue           string          `json:"queue"`
	Service         string          `json:"service"`
	IdempotencyKey  *string         `json:"idempotency_key,omitempty"`
	Params          json.RawMessage `json:"params,omitempty"`
	Priority        int             `json:"priority"`
	MaxAttempts     int             `json:"max_attempts"`
	ScheduledAt     *time.Time      `json:"scheduled_at,omitempty"`
	Status          string          `json:"status"` // pending|active|succeeded|failed|cancelled
	CancelRequested bool            `json:"cancel_requested"`
	AttemptCount    int             `json:"attempt_count"`
	Result          json.RawMessage `json:"result,omitempty"`
	EnqueuedAt      time.Time       `json:"enqueued_at"`
	StartedAt       *time.Time      `json:"started_at,omitempty"`
	CompletedAt     *time.Time      `json:"completed_at,omitempty"`
	UpdatedAt       time.Time       `json:"updated_at"`
	// CurrentRun is populated only when a Get/List was called with
	// include=current_run. nil otherwise.
	CurrentRun *Run `json:"current_run,omitempty"`
}

// Run is one attempt at a Job. Each Claim creates a new Run.
type Run struct {
	ID              string          `json:"id"`
	JobID           string          `json:"job_id"`
	Attempt         int             `json:"attempt"`
	WorkerID        string          `json:"worker_id"`
	Status          string          `json:"status"` // running|succeeded|failed|abandoned
	LeaseExpiresAt  *time.Time      `json:"lease_expires_at,omitempty"`
	ProgressCurrent int64           `json:"progress_current"`
	ProgressTotal   int64           `json:"progress_total"`
	ProgressMessage string          `json:"progress_message,omitempty"`
	Result          json.RawMessage `json:"result,omitempty"`
	Error           string          `json:"error,omitempty"`
	StartedAt       time.Time       `json:"started_at"`
	FinishedAt      *time.Time      `json:"finished_at,omitempty"`
	CreatedAt       time.Time       `json:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at"`
}

// HeartbeatResult is the Heartbeat response: the updated Run plus the
// parent Job's cancel_requested flag, lifted up here so workers can
// observe cooperative cancellation on the request they were already
// sending — no separate GetJob round-trip needed. Run is embedded so
// callers reach Status / ProgressCurrent / etc. directly off the result.
type HeartbeatResult struct {
	Run
	CancelRequested bool `json:"cancel_requested"`
}

// Schedule is a recurring (or future one-shot) recipe for enqueuing
// Jobs. The Foreman scheduler ticks and creates a fresh Job each fire.
type Schedule struct {
	ID          string          `json:"id"`
	Kind        string          `json:"kind"`
	Queue       string          `json:"queue"`
	Service     string          `json:"service"`
	Params      json.RawMessage `json:"params,omitempty"`
	Priority    int             `json:"priority"`
	MaxAttempts int             `json:"max_attempts"`
	CronExpr    string          `json:"cron_expr"`
	Timezone    string          `json:"timezone"`
	Enabled     bool            `json:"enabled"`
	NextFireAt  time.Time       `json:"next_fire_at"`
	LastFireAt  *time.Time      `json:"last_fire_at,omitempty"`
	LastJobID   string          `json:"last_job_id,omitempty"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

// ---------- Requests ----------

type EnqueueRequest struct {
	Kind           string          `json:"kind"`
	Queue          string          `json:"queue,omitempty"`
	Service        string          `json:"service,omitempty"`
	IdempotencyKey *string         `json:"idempotency_key,omitempty"`
	Params         json.RawMessage `json:"params,omitempty"`
	Priority       int             `json:"priority,omitempty"`
	MaxAttempts    int             `json:"max_attempts,omitempty"`
	ScheduledAt    *time.Time      `json:"scheduled_at,omitempty"`
}

type ClaimRequest struct {
	Kinds    []string `json:"kinds"`
	Queues   []string `json:"queues,omitempty"`
	WorkerID string   `json:"worker_id"`
	LeaseSec int      `json:"lease_seconds,omitempty"`
}

type HeartbeatRequest struct {
	WorkerID        string  `json:"worker_id"`
	ProgressCurrent *int64  `json:"progress_current,omitempty"`
	ProgressTotal   *int64  `json:"progress_total,omitempty"`
	ProgressMessage *string `json:"progress_message,omitempty"`
	LeaseSec        int     `json:"lease_seconds,omitempty"`
}

type CompleteRequest struct {
	WorkerID string          `json:"worker_id"`
	Result   json.RawMessage `json:"result,omitempty"`
}

type FailRequest struct {
	WorkerID   string          `json:"worker_id"`
	Error      string          `json:"error,omitempty"`
	Retryable  bool            `json:"retryable"`
	BackoffSec int             `json:"backoff_seconds,omitempty"`
	Result     json.RawMessage `json:"result,omitempty"`
}

type ScheduleRequest struct {
	Kind        string          `json:"kind"`
	Queue       string          `json:"queue,omitempty"`
	Service     string          `json:"service,omitempty"`
	Params      json.RawMessage `json:"params,omitempty"`
	Priority    int             `json:"priority,omitempty"`
	MaxAttempts int             `json:"max_attempts,omitempty"`
	CronExpr    string          `json:"cron_expr"`
	Timezone    string          `json:"timezone,omitempty"`
	Enabled     *bool           `json:"enabled,omitempty"`
}

type JobsFilter struct {
	Status            string
	Kind              string
	Service           string
	Queue             string
	Limit             int
	Cursor            string
	IncludeCurrentRun bool
}

type RunsFilter struct {
	Status   string
	JobID    string
	WorkerID string
	Kind     string
	Limit    int
	Cursor   string
}

type SchedulesFilter struct {
	Kind    string
	Enabled *bool
	Limit   int
	Cursor  string
}

// ---------- Results ----------

// EnqueueResult distinguishes a fresh insert (Created=true) from an
// idempotency-key collision (Created=false, Job points at the existing
// row). Returned without error in both cases — clients usually treat
// "already there" as success.
type EnqueueResult struct {
	Created bool
	Job     Job
}

// Claimed is what Claim returns on success: the job to do plus the run
// the worker now owns.
type Claimed struct {
	Job Job `json:"job"`
	Run Run `json:"run"`
}

// HTTPError is returned for any non-2xx response. Message is the
// server's `{"error": "..."}` field when present, otherwise a generic
// "foreman: <op> responded N".
type HTTPError struct {
	Op         string
	StatusCode int
	Message    string
}

func (e *HTTPError) Error() string {
	if e.Message != "" {
		return fmt.Sprintf("foreman %s: %d %s", e.Op, e.StatusCode, e.Message)
	}
	return fmt.Sprintf("foreman %s: responded %d", e.Op, e.StatusCode)
}

// ---------- Client ----------

// Client talks to a Foreman server. Construct with New(endpoint) or
// build directly with a custom HTTPClient. Safe for concurrent use.
type Client struct {
	// Endpoint is the base URL of the Foreman server. Empty disables
	// every method (returns zero values, no errors).
	Endpoint string
	// HTTPClient overrides the default 30-second client.
	HTTPClient *http.Client
}

// New returns a Client targeting the given endpoint with a 30s
// HTTP timeout.
func New(endpoint string) *Client {
	return &Client{
		Endpoint:   endpoint,
		HTTPClient: &http.Client{Timeout: 30 * time.Second},
	}
}

func (c *Client) disabled() bool { return c == nil || c.Endpoint == "" }

func (c *Client) httpClient() *http.Client {
	if c.HTTPClient != nil {
		return c.HTTPClient
	}
	return http.DefaultClient
}

// ---------- Producer ----------

// Enqueue creates a Job. 409 (idempotency collision) is not an error —
// the result's Job points at the existing row and Created is false.
func (c *Client) Enqueue(ctx context.Context, req EnqueueRequest) (EnqueueResult, error) {
	if c.disabled() {
		return EnqueueResult{}, nil
	}
	resp, err := c.do(ctx, http.MethodPost, "/foreman/jobs", req)
	if err != nil {
		return EnqueueResult{}, err
	}
	defer resp.Body.Close()
	switch resp.StatusCode {
	case http.StatusCreated:
		var job Job
		if err := json.NewDecoder(resp.Body).Decode(&job); err != nil {
			return EnqueueResult{}, fmt.Errorf("decode enqueue: %w", err)
		}
		return EnqueueResult{Created: true, Job: job}, nil
	case http.StatusConflict:
		// Body is {"error": "...", "job": {...}}. The "job" field
		// carries the existing row.
		var body struct {
			Job Job `json:"job"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&body)
		return EnqueueResult{Created: false, Job: body.Job}, nil
	default:
		return EnqueueResult{}, c.errorFromResponse("enqueue", resp)
	}
}

// ---------- Worker ----------

// Claim leases one job matching any of req.Kinds. Returns nil if the
// queue is empty (server 204) — the expected "nothing to do" signal,
// not an error.
func (c *Client) Claim(ctx context.Context, req ClaimRequest) (*Claimed, error) {
	if c.disabled() {
		return nil, nil
	}
	resp, err := c.do(ctx, http.MethodPost, "/foreman/jobs/claim", req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	switch resp.StatusCode {
	case http.StatusOK:
		var out Claimed
		if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
			return nil, fmt.Errorf("decode claim: %w", err)
		}
		return &out, nil
	case http.StatusNoContent:
		return nil, nil
	default:
		return nil, c.errorFromResponse("claim", resp)
	}
}

// Heartbeat extends the lease on the calling worker's in-flight run
// and optionally reports progress. Returns the updated Run plus the
// parent job's cancel_requested flag — when true, the handler should
// wrap up promptly and the Worker abstraction will cancel its context.
func (c *Client) Heartbeat(ctx context.Context, runID string, req HeartbeatRequest) (HeartbeatResult, error) {
	if c.disabled() {
		return HeartbeatResult{}, nil
	}
	var out HeartbeatResult
	if err := c.simpleJSON(ctx, http.MethodPost, "/foreman/runs/"+runID+"/heartbeat", req, &out, "heartbeat"); err != nil {
		return HeartbeatResult{}, err
	}
	return out, nil
}

// Complete marks the run succeeded and terminalizes the parent job.
// Returns the updated Job.
func (c *Client) Complete(ctx context.Context, runID string, req CompleteRequest) (Job, error) {
	if c.disabled() {
		return Job{}, nil
	}
	var out Job
	if err := c.simpleJSON(ctx, http.MethodPost, "/foreman/runs/"+runID+"/complete", req, &out, "complete"); err != nil {
		return Job{}, err
	}
	return out, nil
}

// Fail records a failed attempt. If req.Retryable and attempts remain,
// the parent job goes back to pending with req.BackoffSec; otherwise
// it terminalizes.
func (c *Client) Fail(ctx context.Context, runID string, req FailRequest) (Job, error) {
	if c.disabled() {
		return Job{}, nil
	}
	var out Job
	if err := c.simpleJSON(ctx, http.MethodPost, "/foreman/runs/"+runID+"/fail", req, &out, "fail"); err != nil {
		return Job{}, err
	}
	return out, nil
}

// Cancel cancels a pending job immediately, or flags a running job for
// cooperative cancellation. Terminal jobs return unchanged.
func (c *Client) Cancel(ctx context.Context, jobID string) (Job, error) {
	if c.disabled() {
		return Job{}, nil
	}
	var out Job
	// POST with no body — pass nil and the helper omits it.
	if err := c.simpleJSON(ctx, http.MethodPost, "/foreman/jobs/"+jobID+"/cancel", nil, &out, "cancel"); err != nil {
		return Job{}, err
	}
	return out, nil
}

// ---------- Reads ----------

func (c *Client) GetJob(ctx context.Context, jobID string, includeCurrentRun bool) (Job, error) {
	if c.disabled() {
		return Job{}, nil
	}
	q := url.Values{}
	if includeCurrentRun {
		q.Set("include", "current_run")
	}
	var out Job
	if err := c.simpleJSON(ctx, http.MethodGet, "/foreman/jobs/"+jobID, queryParams{q: q}, &out, "get-job"); err != nil {
		return Job{}, err
	}
	return out, nil
}

func (c *Client) ListJobs(ctx context.Context, f JobsFilter) ([]Job, error) {
	if c.disabled() {
		return nil, nil
	}
	q := url.Values{}
	if f.Status != "" {
		q.Set("status", f.Status)
	}
	if f.Kind != "" {
		q.Set("kind", f.Kind)
	}
	if f.Service != "" {
		q.Set("service", f.Service)
	}
	if f.Queue != "" {
		q.Set("queue", f.Queue)
	}
	if f.Limit > 0 {
		q.Set("limit", strconv.Itoa(f.Limit))
	}
	if f.Cursor != "" {
		q.Set("cursor", f.Cursor)
	}
	if f.IncludeCurrentRun {
		q.Set("include", "current_run")
	}
	var out []Job
	if err := c.simpleJSON(ctx, http.MethodGet, "/foreman/jobs", queryParams{q: q}, &out, "list-jobs"); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *Client) GetRun(ctx context.Context, runID string) (Run, error) {
	if c.disabled() {
		return Run{}, nil
	}
	var out Run
	if err := c.simpleJSON(ctx, http.MethodGet, "/foreman/runs/"+runID, nil, &out, "get-run"); err != nil {
		return Run{}, err
	}
	return out, nil
}

// ListJobRuns returns every attempt at the given job, oldest first.
func (c *Client) ListJobRuns(ctx context.Context, jobID string) ([]Run, error) {
	if c.disabled() {
		return nil, nil
	}
	var out []Run
	if err := c.simpleJSON(ctx, http.MethodGet, "/foreman/jobs/"+jobID+"/runs", nil, &out, "list-job-runs"); err != nil {
		return nil, err
	}
	return out, nil
}

// ListRuns is the global runs query, optionally filtered.
func (c *Client) ListRuns(ctx context.Context, f RunsFilter) ([]Run, error) {
	if c.disabled() {
		return nil, nil
	}
	q := url.Values{}
	if f.Status != "" {
		q.Set("status", f.Status)
	}
	if f.JobID != "" {
		q.Set("job_id", f.JobID)
	}
	if f.WorkerID != "" {
		q.Set("worker_id", f.WorkerID)
	}
	if f.Kind != "" {
		q.Set("kind", f.Kind)
	}
	if f.Limit > 0 {
		q.Set("limit", strconv.Itoa(f.Limit))
	}
	if f.Cursor != "" {
		q.Set("cursor", f.Cursor)
	}
	var out []Run
	if err := c.simpleJSON(ctx, http.MethodGet, "/foreman/runs", queryParams{q: q}, &out, "list-runs"); err != nil {
		return nil, err
	}
	return out, nil
}

// ---------- Schedules ----------

func (c *Client) CreateSchedule(ctx context.Context, req ScheduleRequest) (Schedule, error) {
	if c.disabled() {
		return Schedule{}, nil
	}
	var out Schedule
	if err := c.simpleJSON(ctx, http.MethodPost, "/foreman/schedules", req, &out, "create-schedule"); err != nil {
		return Schedule{}, err
	}
	return out, nil
}

func (c *Client) GetSchedule(ctx context.Context, scheduleID string) (Schedule, error) {
	if c.disabled() {
		return Schedule{}, nil
	}
	var out Schedule
	if err := c.simpleJSON(ctx, http.MethodGet, "/foreman/schedules/"+scheduleID, nil, &out, "get-schedule"); err != nil {
		return Schedule{}, err
	}
	return out, nil
}

func (c *Client) ListSchedules(ctx context.Context, f SchedulesFilter) ([]Schedule, error) {
	if c.disabled() {
		return nil, nil
	}
	q := url.Values{}
	if f.Kind != "" {
		q.Set("kind", f.Kind)
	}
	if f.Enabled != nil {
		q.Set("enabled", strconv.FormatBool(*f.Enabled))
	}
	if f.Limit > 0 {
		q.Set("limit", strconv.Itoa(f.Limit))
	}
	if f.Cursor != "" {
		q.Set("cursor", f.Cursor)
	}
	var out []Schedule
	if err := c.simpleJSON(ctx, http.MethodGet, "/foreman/schedules", queryParams{q: q}, &out, "list-schedules"); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *Client) UpdateSchedule(ctx context.Context, scheduleID string, req ScheduleRequest) (Schedule, error) {
	if c.disabled() {
		return Schedule{}, nil
	}
	var out Schedule
	if err := c.simpleJSON(ctx, http.MethodPut, "/foreman/schedules/"+scheduleID, req, &out, "update-schedule"); err != nil {
		return Schedule{}, err
	}
	return out, nil
}

func (c *Client) DeleteSchedule(ctx context.Context, scheduleID string) error {
	if c.disabled() {
		return nil
	}
	resp, err := c.do(ctx, http.MethodDelete, "/foreman/schedules/"+scheduleID, nil)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return c.errorFromResponse("delete-schedule", resp)
	}
	return nil
}

// FireSchedule manually enqueues the schedule's recipe without
// disturbing NextFireAt. Useful for "run it now" buttons.
func (c *Client) FireSchedule(ctx context.Context, scheduleID string) (Job, error) {
	if c.disabled() {
		return Job{}, nil
	}
	var out Job
	if err := c.simpleJSON(ctx, http.MethodPost, "/foreman/schedules/"+scheduleID+"/fire", nil, &out, "fire-schedule"); err != nil {
		return Job{}, err
	}
	return out, nil
}

// ---------- internals ----------

// queryParams is passed to do() to attach url.Values; using a typed
// wrapper keeps the do signature ergonomic for both "no params" and
// "body but no params" calls.
type queryParams struct{ q url.Values }

// simpleJSON is the standard "POST body, decode 2xx JSON, otherwise
// error" path. Used by every endpoint except Enqueue (special 409
// folding) and Claim (special 204 handling).
func (c *Client) simpleJSON(ctx context.Context, method, path string, body any, out any, op string) error {
	resp, err := c.do(ctx, method, path, body)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return c.errorFromResponse(op, resp)
	}
	if out == nil {
		return nil
	}
	if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
		return fmt.Errorf("decode %s: %w", op, err)
	}
	return nil
}

// do builds + executes an HTTP request. body can be: nil (no body),
// queryParams (no body, attach query string), or any JSON-serializable
// value (sent as application/json).
func (c *Client) do(ctx context.Context, method, path string, body any) (*http.Response, error) {
	u := strings.TrimRight(c.Endpoint, "/") + path
	var rdr io.Reader
	contentType := ""
	switch v := body.(type) {
	case nil:
		// no body
	case queryParams:
		if len(v.q) > 0 {
			u += "?" + v.q.Encode()
		}
	default:
		buf, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("marshal: %w", err)
		}
		rdr = bytes.NewReader(buf)
		contentType = "application/json"
	}

	// Handle GETs with query-only bodies by re-encoding the path.
	// simpleJSON passes the queryParams via `body`, but those calls
	// use GET and never have a JSON body. If queryParams was set we
	// already appended ?…; rdr stays nil.
	req, err := http.NewRequestWithContext(ctx, method, u, rdr)
	if err != nil {
		return nil, fmt.Errorf("new request: %w", err)
	}
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	return c.httpClient().Do(req)
}

func (c *Client) errorFromResponse(op string, resp *http.Response) error {
	buf, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
	var body struct {
		Error string `json:"error"`
	}
	_ = json.Unmarshal(buf, &body)
	return &HTTPError{Op: op, StatusCode: resp.StatusCode, Message: body.Error}
}

// IsConflict reports whether err is a *HTTPError with status 409 —
// useful for callers that want to special-case "already exists."
func IsConflict(err error) bool {
	var he *HTTPError
	return errors.As(err, &he) && he.StatusCode == http.StatusConflict
}

// IsNotFound reports whether err is a *HTTPError with status 404.
func IsNotFound(err error) bool {
	var he *HTTPError
	return errors.As(err, &he) && he.StatusCode == http.StatusNotFound
}

// Ptr is a tiny helper for taking the address of a literal — handy for
// the *string / *bool / *time.Time fields in request structs.
func Ptr[T any](v T) *T { return &v }

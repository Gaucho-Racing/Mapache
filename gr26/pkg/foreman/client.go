// Package foreman is gr26's HTTP client for the central foreman job
// queue. Covers both the producer side (Enqueue) and the worker side
// (Claim, Heartbeat, Complete, Fail) — gr26 plays both roles depending
// on the message: TCMShelterBatch arrival enqueues a job; the worker
// pool claims and runs them.
package foreman

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gaucho-racing/mapache/gr26/config"
	"github.com/gaucho-racing/mapache/gr26/pkg/logger"
)

// Job is the subset of foreman's Job record a worker needs to act on
// a claim. Other fields (priority, lease, worker_id, etc.) are tracked
// foreman-side; we don't echo them back to the handler.
type Job struct {
	ID          string          `json:"id"`
	Kind        string          `json:"kind"`
	Queue       string          `json:"queue"`
	Service     string          `json:"service"`
	Params      json.RawMessage `json:"params"`
	Attempt     int             `json:"attempt"`
	MaxAttempts int             `json:"max_attempts"`
}

// EnqueueRequest is the body POSTed to foreman /jobs. Fields mirror
// foreman/api/job.go's enqueueRequest exactly.
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
	WorkerID   string `json:"worker_id"`
	Error      string `json:"error,omitempty"`
	Retryable  bool   `json:"retryable"`
	BackoffSec int    `json:"backoff_seconds,omitempty"`
}

var httpClient = &http.Client{Timeout: 30 * time.Second}

// EnqueueResult is what callers get back from Enqueue. Created
// distinguishes 201 (new job) from 409 (idempotency key collision,
// existing job returned). JobID is populated for both — handy for
// fan-out callers that want to record which jobs they queued.
type EnqueueResult struct {
	Created bool
	JobID   string
}

// Enqueue POSTs the request to foreman. Treats 409 as a non-error
// (Created=false) so idempotent retransmits don't bubble as failures.
// Returns a zero EnqueueResult when FOREMAN_ENDPOINT is unset.
func Enqueue(ctx context.Context, req EnqueueRequest) (EnqueueResult, error) {
	if config.ForemanEndpoint == "" {
		return EnqueueResult{}, nil
	}
	resp, err := doJSON(ctx, http.MethodPost, "/foreman/jobs", req)
	if err != nil {
		return EnqueueResult{}, err
	}
	defer resp.Body.Close()
	switch resp.StatusCode {
	case http.StatusCreated:
		var job Job
		if err := json.NewDecoder(resp.Body).Decode(&job); err != nil {
			return EnqueueResult{}, fmt.Errorf("decode created: %w", err)
		}
		return EnqueueResult{Created: true, JobID: job.ID}, nil
	case http.StatusConflict:
		var body struct {
			Job Job `json:"job"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
			logger.SugarLogger.Debugf("[FOREMAN] conflict decode (kind=%s): %v", req.Kind, err)
			return EnqueueResult{Created: false}, nil
		}
		logger.SugarLogger.Debugf("[FOREMAN] job already enqueued (kind=%s, idem=%v, id=%s)",
			req.Kind, deref(req.IdempotencyKey), body.Job.ID)
		return EnqueueResult{Created: false, JobID: body.Job.ID}, nil
	default:
		return EnqueueResult{}, fmt.Errorf("enqueue: foreman responded %d", resp.StatusCode)
	}
}

// Claim asks foreman for one job matching any of req.Kinds. Returns
// (nil, nil) when nothing is available (foreman 204) — that's the
// expected "queue empty" signal, not an error.
func Claim(ctx context.Context, req ClaimRequest) (*Job, error) {
	if config.ForemanEndpoint == "" {
		return nil, nil
	}
	resp, err := doJSON(ctx, http.MethodPost, "/foreman/claim", req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	switch resp.StatusCode {
	case http.StatusOK:
		var job Job
		if err := json.NewDecoder(resp.Body).Decode(&job); err != nil {
			return nil, fmt.Errorf("claim decode: %w", err)
		}
		return &job, nil
	case http.StatusNoContent:
		return nil, nil
	default:
		return nil, fmt.Errorf("claim: foreman responded %d", resp.StatusCode)
	}
}

// Heartbeat extends the lease on an in-flight job. Workers should call
// this periodically for long-running jobs so foreman's reaper doesn't
// take the lease back.
func Heartbeat(ctx context.Context, jobID string, req HeartbeatRequest) error {
	if config.ForemanEndpoint == "" {
		return nil
	}
	resp, err := doJSON(ctx, http.MethodPost, "/foreman/jobs/"+jobID+"/heartbeat", req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("heartbeat: foreman responded %d", resp.StatusCode)
	}
	return nil
}

func Complete(ctx context.Context, jobID string, req CompleteRequest) error {
	if config.ForemanEndpoint == "" {
		return nil
	}
	resp, err := doJSON(ctx, http.MethodPost, "/foreman/jobs/"+jobID+"/complete", req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("complete: foreman responded %d", resp.StatusCode)
	}
	return nil
}

func Fail(ctx context.Context, jobID string, req FailRequest) error {
	if config.ForemanEndpoint == "" {
		return nil
	}
	resp, err := doJSON(ctx, http.MethodPost, "/foreman/jobs/"+jobID+"/fail", req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("fail: foreman responded %d", resp.StatusCode)
	}
	return nil
}

func doJSON(ctx context.Context, method, path string, body any) (*http.Response, error) {
	buf, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("marshal: %w", err)
	}
	url := strings.TrimRight(config.ForemanEndpoint, "/") + path
	req, err := http.NewRequestWithContext(ctx, method, url, bytes.NewReader(buf))
	if err != nil {
		return nil, fmt.Errorf("new request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	// Service-to-service auth was removed; foreman endpoints are public.
	// Add X-Foreman-Token back here (with a corresponding ForemanToken
	// config var) when re-introducing the guard.
	return httpClient.Do(req)
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// Package foreman is a thin HTTP client for gr26 to enqueue jobs into
// the central Foreman queue. Mirrors foreman's POST /foreman/jobs body
// shape; not a full client (no claim/heartbeat/complete here — gr26 is
// a job producer, not a worker, in this direction).
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

var httpClient = &http.Client{Timeout: 5 * time.Second}

// Enqueue POSTs the request to foreman. Returns nil on success (201) or
// conflict (409 — idempotency key collision, treated as "already
// enqueued"). Logs and returns the error for everything else. No-op when
// FOREMAN_ENDPOINT is unset so a misconfigured-but-running gr26 doesn't
// crash on every TCMShelterBatch.
func Enqueue(ctx context.Context, req EnqueueRequest) error {
	if config.ForemanEndpoint == "" {
		return nil
	}

	body, err := json.Marshal(req)
	if err != nil {
		return fmt.Errorf("marshal: %w", err)
	}

	url := strings.TrimRight(config.ForemanEndpoint, "/") + "/foreman/jobs"
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("new request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	if config.ForemanToken != "" {
		httpReq.Header.Set("X-Foreman-Token", config.ForemanToken)
	}

	resp, err := httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("post: %w", err)
	}
	defer resp.Body.Close()

	switch resp.StatusCode {
	case http.StatusCreated:
		return nil
	case http.StatusConflict:
		// Idempotency key matched an existing job — treat as success.
		// Foreman returned the existing job in the body; we don't care.
		logger.SugarLogger.Debugf("[FOREMAN] job already enqueued (kind=%s, idem=%v)", req.Kind, deref(req.IdempotencyKey))
		return nil
	default:
		return fmt.Errorf("foreman responded %d", resp.StatusCode)
	}
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

package worker

import (
	"context"
	"math/rand/v2"
	"os"
	"time"

	"github.com/gaucho-racing/mapache/gr26/pkg/foreman"
	"github.com/gaucho-racing/mapache/gr26/pkg/logger"
)

// jitter returns 1-5 seconds of random delay. Used to spread worker
// startup and post-error retries so N replicas don't hammer foreman
// in lockstep.
func jitter() time.Duration {
	return time.Duration(1+rand.IntN(5)) * time.Second
}

// Tuning constants. Exposed as variables not consts so tests can poke
// them, but no env wiring yet — defaults are fine until we have ops
// data saying otherwise.
var (
	// claimLeaseSec is the lease duration we request when claiming.
	// Foreman's reaper will sweep the job back to pending if our
	// heartbeat doesn't extend the lease past this window.
	claimLeaseSec = 60

	// heartbeatInterval is how often a running handler refreshes its
	// lease and emits progress (if the handler is publishing any).
	// Should be comfortably less than claimLeaseSec.
	heartbeatInterval = 10 * time.Second

	// claimEmptySleep is how long a worker waits after foreman returns
	// 204 (no jobs available) before trying again. Tradeoff: shorter
	// = lower latency on new jobs, more foreman load.
	claimEmptySleep = 5 * time.Second

	// claimErrorBackoff is how long a worker waits after a transient
	// HTTP error from foreman before retrying.
	claimErrorBackoff = 10 * time.Second
)

type Worker struct {
	ID       string
	Registry *Registry
}

// Run loops forever (or until ctx cancels) — claim → handle → ack —
// with backoff on empty queue and on transient errors.
func (w *Worker) Run(ctx context.Context) {
	kinds := w.Registry.Kinds()
	logger.SugarLogger.Infof("[WORKER %s] starting, kinds=%v", w.ID, kinds)

	for {
		if ctx.Err() != nil {
			return
		}

		job, err := foreman.Claim(ctx, foreman.ClaimRequest{
			Kinds:    kinds,
			WorkerID: w.ID,
			LeaseSec: claimLeaseSec,
		})
		if err != nil {
			logger.SugarLogger.Errorf("[WORKER %s] claim failed: %v", w.ID, err)
			sleep(ctx, claimErrorBackoff+jitter())
			continue
		}
		if job == nil {
			sleep(ctx, claimEmptySleep)
			continue
		}

		w.runJob(ctx, job)
	}
}

func (w *Worker) runJob(ctx context.Context, job *foreman.Job) {
	logger.SugarLogger.Infof("[WORKER %s] claimed job %s (kind=%s, attempt=%d/%d)",
		w.ID, job.ID, job.Kind, job.Attempt, job.MaxAttempts)

	progress := &ProgressReporter{}

	// Heartbeat in the background while the handler runs. Each tick
	// also folds in whatever progress the handler has Set most recently.
	hbCtx, cancelHB := context.WithCancel(ctx)
	hbDone := make(chan struct{})
	go func() {
		defer close(hbDone)
		ticker := time.NewTicker(heartbeatInterval)
		defer ticker.Stop()
		for {
			select {
			case <-hbCtx.Done():
				return
			case <-ticker.C:
				req := foreman.HeartbeatRequest{
					WorkerID: w.ID,
					LeaseSec: claimLeaseSec,
				}
				if cur, tot, msg, set := progress.snapshot(); set {
					req.ProgressCurrent = &cur
					req.ProgressTotal = &tot
					if msg != "" {
						req.ProgressMessage = &msg
					}
				}
				if err := foreman.Heartbeat(ctx, job.ID, req); err != nil {
					logger.SugarLogger.Warnf("[WORKER %s] heartbeat %s failed: %v", w.ID, job.ID, err)
				}
			}
		}
	}()

	start := time.Now()
	result, handlerErr := w.Registry.Handle(ctx, job, progress)
	cancelHB()
	<-hbDone

	if handlerErr != nil {
		logger.SugarLogger.Errorf("[WORKER %s] job %s failed in %s: %v", w.ID, job.ID, time.Since(start), handlerErr)
		retryable := job.Attempt < job.MaxAttempts
		if err := foreman.Fail(ctx, job.ID, foreman.FailRequest{
			WorkerID:  w.ID,
			Error:     handlerErr.Error(),
			Retryable: retryable,
		}); err != nil {
			logger.SugarLogger.Errorf("[WORKER %s] couldn't report failure on %s: %v", w.ID, job.ID, err)
		}
		sleep(ctx, jitter())
		return
	}

	// Flush the handler's final progress before Complete so the DB row
	// reflects the terminal state, not whatever the last 10s ticker
	// happened to catch. Handlers that ended mid-tick would otherwise
	// freeze at the last snapshot (e.g. 991k/1M instead of 1M/1M).
	if cur, tot, msg, set := progress.snapshot(); set {
		req := foreman.HeartbeatRequest{
			WorkerID:        w.ID,
			LeaseSec:        claimLeaseSec,
			ProgressCurrent: &cur,
			ProgressTotal:   &tot,
		}
		if msg != "" {
			req.ProgressMessage = &msg
		}
		if err := foreman.Heartbeat(ctx, job.ID, req); err != nil {
			logger.SugarLogger.Warnf("[WORKER %s] final heartbeat %s failed: %v", w.ID, job.ID, err)
		}
	}

	if err := foreman.Complete(ctx, job.ID, foreman.CompleteRequest{
		WorkerID: w.ID,
		Result:   result,
	}); err != nil {
		logger.SugarLogger.Errorf("[WORKER %s] couldn't report success on %s: %v", w.ID, job.ID, err)
		return
	}
	logger.SugarLogger.Infof("[WORKER %s] job %s done in %s", w.ID, job.ID, time.Since(start))
}

func sleep(ctx context.Context, d time.Duration) {
	t := time.NewTimer(d)
	defer t.Stop()
	select {
	case <-ctx.Done():
	case <-t.C:
	}
}

// hostname returns the container hostname, falling back to "gr26" so
// worker IDs are still stable-ish if Hostname() fails (e.g. in tests).
func hostname() string {
	h, err := os.Hostname()
	if err != nil || h == "" {
		return "gr26"
	}
	return h
}

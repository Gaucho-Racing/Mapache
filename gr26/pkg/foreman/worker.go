// Worker is the canonical claim → handle → heartbeat → terminate loop,
// packaged so consumers don't have to write it themselves. Drop this
// file in alongside foreman.go and you get a synchronous, single-goroutine
// worker driven by handlers you register with Worker.Handle.
//
// Quick start:
//
//	c := foreman.New(os.Getenv("FOREMAN_ENDPOINT"))
//	w := &foreman.Worker{Client: c, WorkerID: "emailer-1", LeaseSec: 60}
//
//	w.Handle("send-email", func(ctx context.Context, job foreman.Job, p *foreman.Progress) (json.RawMessage, error) {
//	    var args struct{ To, Body string }
//	    if err := json.Unmarshal(job.Params, &args); err != nil {
//	        return nil, &foreman.FailError{Message: err.Error(), Retryable: false}
//	    }
//	    p.Set(0, 1, "sending")
//	    if err := smtp.Send(args.To, args.Body); err != nil {
//	        return nil, err // retryable by default
//	    }
//	    return json.RawMessage(`{"sent":true}`), nil
//	})
//
//	if err := w.Run(ctx); err != nil {
//	    log.Fatal(err)
//	}
//
// What Worker does for you, automatically:
//
//   - Atomic claim across all registered kinds with empty-queue backoff
//   - Background heartbeat ticker pinned to LeaseSec/3 by default
//   - Progress updates (via *Progress.Set) piggyback on next heartbeat;
//     no extra request per progress tick
//   - Cooperative cancel: when the server flags the job's
//     cancel_requested (because someone called Cancel), the next
//     heartbeat surfaces it and Worker cancels the handler's context.
//     Handlers should respect ctx.Done() and bail out promptly.
//   - Handler panics convert into a non-retryable Fail with the
//     panic value in the error field — buggy handlers can't tear
//     the worker down.
//   - Graceful shutdown: cancel the parent ctx and Run returns after
//     the in-flight handler (if any) terminalizes.
//
// One Worker handles one job at a time. For parallel execution, spawn
// N Workers (each in its own goroutine) — the server side coordinates
// safely via SELECT ... FOR UPDATE SKIP LOCKED, so they never grab the
// same job.

package foreman

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sync"
	"time"
)

// Handler is the user code that does the actual work for a single Job.
//
// ctx is cancelled when EITHER (a) the server flags cancel_requested on
// the parent Job (cooperative cancel; observed on the next heartbeat),
// or (b) the parent Worker.Run context is cancelled. Handlers MUST
// respect ctx.Done() and return promptly when it fires.
//
// Returning nil + bytes → Complete with that result on the run.
// Returning an error → Fail. By default it's retryable with the
// Worker's DefaultBackoffSec; return a *FailError to override, or
// errors.Is(err, ErrPermanent) for a non-retryable terminalization.
type Handler func(ctx context.Context, job Job, progress *Progress) (json.RawMessage, error)

// ErrPermanent marks a handler error as non-retryable. The job
// terminalizes immediately with that attempt's run marked failed.
//
//	return nil, fmt.Errorf("malformed input: %w", foreman.ErrPermanent)
var ErrPermanent = errors.New("permanent failure")

// FailError lets a handler control retry semantics precisely. Most
// handlers should just return a plain error (retryable) or wrap with
// ErrPermanent (non-retryable) and let Worker pick the backoff.
type FailError struct {
	Message    string
	Retryable  bool
	BackoffSec int // 0 → Worker.DefaultBackoffSec
}

func (e *FailError) Error() string { return e.Message }

// Progress is a thread-safe progress reporter. Handler.Set() updates
// the latest values; the Worker's heartbeat loop drains them and folds
// them into the next heartbeat. Progress is best-effort observability
// for dashboards — not a transactional checkpoint.
type Progress struct {
	mu      sync.Mutex
	current int64
	total   int64
	message string
	dirty   bool
}

// Set records the latest progress. Safe for concurrent callers.
// Calling Set repeatedly between heartbeats is cheap — only the final
// pre-heartbeat value goes over the wire.
func (p *Progress) Set(current, total int64, message string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.current = current
	p.total = total
	p.message = message
	p.dirty = true
}

// drain pulls the latest values, clears dirty, and reports whether
// there's anything new to send. Internal — called from the heartbeat
// loop.
func (p *Progress) drain() (current, total int64, message string, dirty bool) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if !p.dirty {
		return 0, 0, "", false
	}
	p.dirty = false
	return p.current, p.total, p.message, true
}

// Worker owns the claim-execute-heartbeat-terminate loop. Construct one,
// register Handlers via Handle, then call Run.
type Worker struct {
	// Client is the Foreman HTTP client. Required.
	Client *Client
	// WorkerID is the stable identifier the server records against
	// claims and runs. Required. Use something machine-unique
	// (hostname + pid, k8s pod name, etc.) so abandoned runs are
	// attributable.
	WorkerID string

	// Kinds restricts what this worker will claim. If empty, defaults
	// to the set of kinds registered via Handle.
	Kinds []string
	// Queues restricts to specific named queues; empty matches any.
	Queues []string

	// LeaseSec is how long the server holds the lease after each
	// (claim or heartbeat). Default 60. The heartbeat interval is
	// derived as LeaseSec/3 unless HeartbeatInterval is set, so a
	// lost heartbeat fails the lease in <= LeaseSec.
	LeaseSec int

	// HeartbeatInterval overrides the default LeaseSec/3 cadence.
	HeartbeatInterval time.Duration

	// PollInterval is the empty-queue backoff. Default 5s.
	PollInterval time.Duration

	// DefaultBackoffSec is the retry delay applied when a Handler
	// returns a plain error (no FailError wrapping). Default 30.
	DefaultBackoffSec int

	// OnError is called with background-loop errors (Claim failures,
	// heartbeat failures, terminal-call failures). Useful for logging
	// or metrics. nil means swallow silently.
	OnError func(error)

	mu       sync.Mutex
	handlers map[string]Handler
}

// Handle registers a Handler for jobs of the given kind. Call once
// per kind before Run. Re-registering replaces the previous handler.
func (w *Worker) Handle(kind string, fn Handler) {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.handlers == nil {
		w.handlers = map[string]Handler{}
	}
	w.handlers[kind] = fn
}

// Run blocks, claiming and executing one job at a time, until ctx is
// cancelled. Returns nil on clean ctx shutdown, or a non-nil error if
// the worker is misconfigured (no Client, no WorkerID, no handlers).
//
// For concurrent execution within a process, spawn multiple Workers
// in goroutines — they're independent and the server coordinates via
// FOR UPDATE SKIP LOCKED.
func (w *Worker) Run(ctx context.Context) error {
	if w.Client == nil {
		return errors.New("foreman: Worker.Client is nil")
	}
	if w.WorkerID == "" {
		return errors.New("foreman: Worker.WorkerID is empty")
	}

	w.mu.Lock()
	kinds := w.Kinds
	if len(kinds) == 0 {
		kinds = make([]string, 0, len(w.handlers))
		for k := range w.handlers {
			kinds = append(kinds, k)
		}
	}
	if len(kinds) == 0 {
		w.mu.Unlock()
		return errors.New("foreman: no handlers registered (call Worker.Handle)")
	}
	w.mu.Unlock()

	if w.LeaseSec <= 0 {
		w.LeaseSec = 60
	}
	if w.HeartbeatInterval <= 0 {
		w.HeartbeatInterval = time.Duration(w.LeaseSec) * time.Second / 3
	}
	if w.PollInterval <= 0 {
		w.PollInterval = 5 * time.Second
	}
	if w.DefaultBackoffSec <= 0 {
		w.DefaultBackoffSec = 30
	}
	onErr := w.OnError
	if onErr == nil {
		onErr = func(error) {}
	}

	for {
		if ctx.Err() != nil {
			return nil
		}
		claimed, err := w.Client.Claim(ctx, ClaimRequest{
			Kinds:    kinds,
			Queues:   w.Queues,
			WorkerID: w.WorkerID,
			LeaseSec: w.LeaseSec,
		})
		if err != nil {
			if ctx.Err() != nil {
				return nil
			}
			onErr(fmt.Errorf("claim: %w", err))
			if !sleepCtx(ctx, w.PollInterval) {
				return nil
			}
			continue
		}
		if claimed == nil {
			if !sleepCtx(ctx, w.PollInterval) {
				return nil
			}
			continue
		}
		w.handleOne(ctx, *claimed, onErr)
	}
}

// handleOne runs the heartbeat loop alongside the handler, then
// terminalizes the run (Complete on success, Fail on error). A panic
// in the handler is captured and converted into a non-retryable Fail.
func (w *Worker) handleOne(parent context.Context, claimed Claimed, onErr func(error)) {
	handler := w.handlerFor(claimed.Job.Kind)
	if handler == nil {
		// We claimed it but have no handler. Fail non-retryable so the
		// job doesn't loop back to us on the next claim.
		_, err := w.Client.Fail(context.Background(), claimed.Run.ID, FailRequest{
			WorkerID:  w.WorkerID,
			Error:     "no handler registered for kind " + claimed.Job.Kind,
			Retryable: false,
		})
		if err != nil {
			onErr(fmt.Errorf("fail (no handler): %w", err))
		}
		return
	}

	handlerCtx, cancelHandler := context.WithCancel(parent)
	defer cancelHandler()

	progress := &Progress{}
	hbDone := make(chan struct{})
	go w.heartbeatLoop(handlerCtx, claimed.Run.ID, progress, cancelHandler, onErr, hbDone)

	result, runErr := safeCall(handler, handlerCtx, claimed.Job, progress)

	cancelHandler()
	<-hbDone

	// Terminal call uses a detached ctx with a short timeout so a
	// parent-ctx shutdown still gets the run terminalized cleanly.
	termCtx, termCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer termCancel()
	if runErr != nil {
		retryable := true
		backoff := w.DefaultBackoffSec
		msg := runErr.Error()
		var fe *FailError
		if errors.As(runErr, &fe) {
			retryable = fe.Retryable
			if fe.BackoffSec > 0 {
				backoff = fe.BackoffSec
			}
			if fe.Message != "" {
				msg = fe.Message
			}
		} else if errors.Is(runErr, ErrPermanent) {
			retryable = false
		}
		if _, err := w.Client.Fail(termCtx, claimed.Run.ID, FailRequest{
			WorkerID:   w.WorkerID,
			Error:      msg,
			Retryable:  retryable,
			BackoffSec: backoff,
		}); err != nil {
			onErr(fmt.Errorf("fail: %w", err))
		}
	} else {
		if _, err := w.Client.Complete(termCtx, claimed.Run.ID, CompleteRequest{
			WorkerID: w.WorkerID,
			Result:   result,
		}); err != nil {
			onErr(fmt.Errorf("complete: %w", err))
		}
	}
}

// heartbeatLoop pings the server at HeartbeatInterval until ctx fires
// or the server signals cancel_requested. On heartbeat error (lease
// lost, transport blip) it cancels the handler — the worker can't
// trust its lease if the server isn't acking.
func (w *Worker) heartbeatLoop(
	ctx context.Context,
	runID string,
	p *Progress,
	cancelHandler context.CancelFunc,
	onErr func(error),
	done chan<- struct{},
) {
	defer close(done)
	ticker := time.NewTicker(w.HeartbeatInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			req := HeartbeatRequest{WorkerID: w.WorkerID, LeaseSec: w.LeaseSec}
			if cur, tot, msg, dirty := p.drain(); dirty {
				req.ProgressCurrent = &cur
				req.ProgressTotal = &tot
				if msg != "" {
					req.ProgressMessage = &msg
				}
			}
			hbCtx, cancel := context.WithTimeout(ctx, w.HeartbeatInterval)
			res, err := w.Client.Heartbeat(hbCtx, runID, req)
			cancel()
			if err != nil {
				if !errors.Is(err, context.Canceled) {
					onErr(fmt.Errorf("heartbeat: %w", err))
				}
				cancelHandler()
				return
			}
			if res.CancelRequested {
				cancelHandler()
				return
			}
		}
	}
}

// safeCall recovers from handler panics. The panic becomes a
// non-retryable FailError so we don't loop a broken handler.
func safeCall(h Handler, ctx context.Context, job Job, p *Progress) (result json.RawMessage, err error) {
	defer func() {
		if r := recover(); r != nil {
			err = &FailError{
				Message:   fmt.Sprintf("handler panic: %v", r),
				Retryable: false,
			}
		}
	}()
	return h(ctx, job, p)
}

func (w *Worker) handlerFor(kind string) Handler {
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.handlers[kind]
}

// sleepCtx blocks for d unless ctx fires. Returns true if the full
// duration elapsed, false if ctx fired first.
func sleepCtx(ctx context.Context, d time.Duration) bool {
	t := time.NewTimer(d)
	defer t.Stop()
	select {
	case <-ctx.Done():
		return false
	case <-t.C:
		return true
	}
}

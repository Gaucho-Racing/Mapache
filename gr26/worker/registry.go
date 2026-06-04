package worker

import (
	"context"
	"fmt"

	"github.com/gaucho-racing/mapache/gr26/pkg/foreman"
)

// Handler is the contract a job kind's worker code satisfies. The
// returned error is what foreman gets — nil = Complete, non-nil = Fail
// (with the error string in the message).
//
// The ProgressReporter is supplied by the worker so the handler can
// publish progress that rides along on the next heartbeat. Handlers
// that don't care about reporting progress can ignore it.
type Handler func(ctx context.Context, job *foreman.Job, progress *ProgressReporter) error

// Registry maps job kinds to handlers. A single Registry is shared
// across all workers in the pool; lookups are read-only at runtime so
// no locking after construction.
type Registry struct {
	handlers map[string]Handler
}

func NewRegistry() *Registry {
	return &Registry{handlers: make(map[string]Handler)}
}

// Register associates a handler with a kind. Panics on duplicate
// registration — fail loud at startup rather than silently overwriting.
func (r *Registry) Register(kind string, h Handler) {
	if _, exists := r.handlers[kind]; exists {
		panic(fmt.Sprintf("worker: kind %q already registered", kind))
	}
	r.handlers[kind] = h
}

// Kinds returns the kinds the registry knows about. Used by workers to
// build their claim request.
func (r *Registry) Kinds() []string {
	kinds := make([]string, 0, len(r.handlers))
	for k := range r.handlers {
		kinds = append(kinds, k)
	}
	return kinds
}

// Handle dispatches a claimed job to the matching handler. Returns an
// error if no handler is registered for the job's kind — that path
// shouldn't fire in practice (foreman only claims kinds we asked for)
// but a clear error helps if registration drifts.
func (r *Registry) Handle(ctx context.Context, job *foreman.Job, progress *ProgressReporter) error {
	h, ok := r.handlers[job.Kind]
	if !ok {
		return fmt.Errorf("no handler registered for kind %q", job.Kind)
	}
	return h(ctx, job, progress)
}

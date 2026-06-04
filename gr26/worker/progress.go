package worker

import "sync"

// ProgressReporter is what a job handler uses to push its current
// progress into the heartbeat loop. The reporter is shared between the
// handler (writer) and the worker's heartbeat goroutine (reader); each
// heartbeat snapshots whatever the handler has Set most recently and
// folds those values into the foreman heartbeat call.
//
// Until Set is called at least once, snapshot reports set=false and the
// heartbeat omits the progress fields entirely — a handler that doesn't
// care about progress can just ignore the reporter.
type ProgressReporter struct {
	mu      sync.Mutex
	set     bool
	current int64
	total   int64
	message string
}

// Set publishes a new progress reading. Safe for concurrent use; the
// heartbeat goroutine reads on its own cadence so there's no
// back-pressure on the handler — call it as often as you want.
func (p *ProgressReporter) Set(current, total int64, message string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.set = true
	p.current = current
	p.total = total
	p.message = message
}

// snapshot returns the most recently Set values plus a flag for whether
// Set was ever called.
func (p *ProgressReporter) snapshot() (current, total int64, message string, set bool) {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.current, p.total, p.message, p.set
}

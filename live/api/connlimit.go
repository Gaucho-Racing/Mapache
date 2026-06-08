package api

import "sync/atomic"

// connGate bounds concurrent live streams per replica. acquire reports whether
// a slot was taken; the caller must release exactly once iff it returned true.
type connGate struct {
	active atomic.Int64
	max    int64
}

func newConnGate(max int) *connGate {
	return &connGate{max: int64(max)}
}

func (g *connGate) acquire() bool {
	if g.active.Add(1) > g.max {
		g.active.Add(-1)
		return false
	}
	return true
}

func (g *connGate) release() {
	g.active.Add(-1)
}

func (g *connGate) count() int64 {
	return g.active.Load()
}

package service

import (
	"sync"

	mapache "github.com/gaucho-racing/mapache/mapache-go/v3"
)

// latencyTracker keeps a running EWMA of ingest latency in microseconds —
// the gap between the CAN-frame timestamp on a signal and the wall-clock
// `created_at` that gr26 stamps before publishing to MQTT. Single
// package-global instance; sample rate is signal-rate (low thousands of Hz
// at peak), so the mutex is more than fast enough.
type latencyTracker struct {
	mu         sync.Mutex
	ewmaMicros float64
	samples    uint64
}

// Latency is the package-global tracker. Updated on every inbound signal
// the live service receives over MQTT (see handler.go).
var Latency = &latencyTracker{}

// ewma smoothing factor: 0.1 = ~10-sample memory. New samples nudge the
// average but a few outliers can't dominate. Matches the previous
// dashboard-side EWMA so the displayed number stays comparable.
const latencyAlpha = 0.1

// latencyClampMicros bounds individual samples. Anything outside this
// window (or negative) almost certainly reflects producer/server clock
// skew, not real ingest delay — drop rather than pollute the EWMA.
const latencyClampMicros = 60_000_000 // 60s

// Record folds one signal's latency into the EWMA. Safe to call from the
// MQTT callback goroutine.
func (l *latencyTracker) Record(s mapache.Signal) {
	if s.CreatedAt.IsZero() || s.Timestamp == 0 {
		return
	}
	delta := s.CreatedAt.UnixMicro() - int64(s.Timestamp)
	if delta < 0 || delta > latencyClampMicros {
		return
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.samples == 0 {
		l.ewmaMicros = float64(delta)
	} else {
		l.ewmaMicros = (1-latencyAlpha)*l.ewmaMicros + latencyAlpha*float64(delta)
	}
	l.samples++
}

// LatencyStats is the JSON-facing snapshot.
type LatencyStats struct {
	// EwmaMs is the smoothed ingest latency in milliseconds.
	EwmaMs float64 `json:"ewma_ms"`
	// Samples is the count of signals folded into the EWMA so far.
	Samples uint64 `json:"samples"`
}

func (l *latencyTracker) Stats() LatencyStats {
	l.mu.Lock()
	defer l.mu.Unlock()
	return LatencyStats{
		EwmaMs:  l.ewmaMicros / 1000.0,
		Samples: l.samples,
	}
}

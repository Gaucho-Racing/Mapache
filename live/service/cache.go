package service

import (
	"sort"
	"sync"
	"time"

	mapache "github.com/gaucho-racing/mapache/mapache-go/v3"
)

// Signal.Timestamp is microseconds since epoch (see mapache-go/signal.go and
// the CH `fromUnixTimestamp64Micro` materialized column). Eviction and
// backfill cursors are in the same unit.
const microsPerSecond = 1_000_000

// ringBuf is the per-(vehicle, signal) buffer. Stored signals are roughly
// in arrival order; we don't enforce strict timestamp sort because
// downstream snapshot does a final sort and out-of-order arrivals are rare.
type ringBuf struct {
	mu  sync.Mutex
	buf []mapache.Signal
}

func (r *ringBuf) put(s mapache.Signal, cutoffMicros int) {
	r.mu.Lock()
	defer r.mu.Unlock()
	// Drop expired entries from the head. With in-order arrival this is
	// O(1) amortized; with occasional out-of-order it's still bounded by
	// the number of expired entries.
	i := 0
	for i < len(r.buf) && r.buf[i].Timestamp < cutoffMicros {
		i++
	}
	if i > 0 {
		copy(r.buf, r.buf[i:])
		r.buf = r.buf[:len(r.buf)-i]
	}
	r.buf = append(r.buf, s)
}

func (r *ringBuf) snapshot(sinceMicros int) []mapache.Signal {
	r.mu.Lock()
	defer r.mu.Unlock()
	if len(r.buf) == 0 {
		return nil
	}
	out := make([]mapache.Signal, 0, len(r.buf))
	for _, s := range r.buf {
		if s.Timestamp >= sinceMicros {
			out = append(out, s)
		}
	}
	return out
}

// Cache is the package-global recent-signal cache. Per-(vehicle, signal)
// ring buffers retain the last `window` seconds of history. Used to bridge
// Clickhouse ingestion delay for newly-connecting clients.
type Cache struct {
	mu     sync.RWMutex
	window time.Duration
	bufs   map[string]map[string]*ringBuf
}

var Recent *Cache

// InitCache configures the package-global cache. Call once during startup,
// before any Put or Snapshot. Window is the retention duration.
func InitCache(window time.Duration) {
	Recent = &Cache{
		window: window,
		bufs:   make(map[string]map[string]*ringBuf),
	}
}

func (c *Cache) getOrCreate(vehicleID, name string) *ringBuf {
	c.mu.RLock()
	if vm, ok := c.bufs[vehicleID]; ok {
		if rb, ok := vm[name]; ok {
			c.mu.RUnlock()
			return rb
		}
	}
	c.mu.RUnlock()

	c.mu.Lock()
	defer c.mu.Unlock()
	if c.bufs[vehicleID] == nil {
		c.bufs[vehicleID] = make(map[string]*ringBuf)
	}
	if rb, ok := c.bufs[vehicleID][name]; ok {
		return rb
	}
	rb := &ringBuf{}
	c.bufs[vehicleID][name] = rb
	return rb
}

func (c *Cache) Put(s mapache.Signal) {
	cutoff := time.Now().UnixMicro() - int64(c.window/time.Microsecond)
	rb := c.getOrCreate(s.VehicleID, s.Name)
	rb.put(s, int(cutoff))
}

// Snapshot returns all signals currently buffered for vehicleID whose name
// matches any of subs (exact or glob) and whose timestamp is at or after
// sinceMicros. Results are sorted by timestamp ascending so the transport
// can stream them in order. sinceMicros == 0 means "everything in cache."
func (c *Cache) Snapshot(vehicleID string, subs []string, sinceMicros int) []mapache.Signal {
	c.mu.RLock()
	vm, ok := c.bufs[vehicleID]
	if !ok {
		c.mu.RUnlock()
		return nil
	}
	// Collect candidate buffers under the top-level read lock, then
	// release before snapshotting each to keep contention low.
	candidates := make([]*ringBuf, 0, len(vm))
	for name, rb := range vm {
		if Matches(name, subs) {
			candidates = append(candidates, rb)
		}
	}
	c.mu.RUnlock()

	var out []mapache.Signal
	for _, rb := range candidates {
		out = append(out, rb.snapshot(sinceMicros)...)
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].Timestamp < out[j].Timestamp
	})
	return out
}

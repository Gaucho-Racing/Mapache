package service

import (
	"sort"
	"sync"
	"time"
	"unsafe"

	mapache "github.com/gaucho-racing/mapache/mapache-go/v3"
)

// signalStructBytes is the fixed-size memory footprint of a Signal — its
// numeric fields, time.Time pairs, and string headers (NOT the string
// contents, which live behind those headers and are added per-instance).
var signalStructBytes = int(unsafe.Sizeof(mapache.Signal{}))

// ringBuf is the per-(vehicle, signal) buffer. Stored signals are roughly
// in arrival order; we don't enforce strict sort because downstream
// snapshot does a final sort and out-of-order arrivals are rare.
type ringBuf struct {
	mu  sync.Mutex
	buf []mapache.Signal
}

func (r *ringBuf) put(s mapache.Signal, cutoff time.Time) {
	r.mu.Lock()
	defer r.mu.Unlock()
	// Drop expired entries from the head. With in-order arrival this is
	// O(1) amortized; with occasional out-of-order it's still bounded by
	// the number of expired entries.
	i := 0
	for i < len(r.buf) && r.buf[i].CreatedAt.Before(cutoff) {
		i++
	}
	if i > 0 {
		copy(r.buf, r.buf[i:])
		r.buf = r.buf[:len(r.buf)-i]
	}
	r.buf = append(r.buf, s)
}

func (r *ringBuf) snapshot(since time.Time) []mapache.Signal {
	r.mu.Lock()
	defer r.mu.Unlock()
	if len(r.buf) == 0 {
		return nil
	}
	out := make([]mapache.Signal, 0, len(r.buf))
	for _, s := range r.buf {
		if !s.CreatedAt.Before(since) {
			out = append(out, s)
		}
	}
	return out
}

// Cache is the package-global recent-signal cache. Per-(vehicle, signal)
// ring buffers retain the last `window` seconds of history, keyed by the
// ingest-side CreatedAt wall clock (set in gr26 before MQTT publish, so
// independent of producer/CAN-frame clock skew). Used to bridge
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
	cutoff := time.Now().Add(-c.window)
	rb := c.getOrCreate(s.VehicleID, s.Name)
	rb.put(s, cutoff)
}

// CacheStats is a snapshot of cache occupancy at call time.
type CacheStats struct {
	// Vehicles is the count of distinct vehicle_ids with at least one
	// buffered signal.
	Vehicles int `json:"vehicles"`
	// Buckets is the count of distinct (vehicle, signal_name) ring
	// buffers — roughly the per-vehicle signal vocabulary.
	Buckets int `json:"buckets"`
	// Signals is the total number of buffered Signal entries across all
	// buckets.
	Signals int `json:"signals"`
	// Bytes is an approximate heap footprint: Signal struct size times
	// signal count, plus the variable-length string contents (ID,
	// VehicleID, Name) per signal. Does not include slice over-capacity,
	// map overhead, or interned strings, so it's a floor not a ceiling.
	Bytes int `json:"bytes"`
	// WindowSec is the cache retention window in seconds.
	WindowSec int `json:"window_sec"`
}

// Stats walks the cache once and reports occupancy. Cheap relative to the
// signal-rate work the cache does, so safe to call from a /stats handler
// even at a few Hz.
func (c *Cache) Stats() CacheStats {
	c.mu.RLock()
	defer c.mu.RUnlock()
	out := CacheStats{
		WindowSec: int(c.window / time.Second),
	}
	for _, vm := range c.bufs {
		if len(vm) == 0 {
			continue
		}
		out.Vehicles++
		for _, rb := range vm {
			out.Buckets++
			rb.mu.Lock()
			out.Signals += len(rb.buf)
			for i := range rb.buf {
				s := &rb.buf[i]
				out.Bytes += signalStructBytes +
					len(s.ID) + len(s.VehicleID) + len(s.Name)
			}
			rb.mu.Unlock()
		}
	}
	return out
}

// Snapshot returns all signals currently buffered for vehicleID whose name
// matches any of subs (exact or glob) and whose CreatedAt is at or after
// since. Results are sorted by CreatedAt ascending so the transport can
// stream them in order. A zero `since` means "everything in cache."
func (c *Cache) Snapshot(vehicleID string, subs []string, since time.Time) []mapache.Signal {
	c.mu.RLock()
	vm, ok := c.bufs[vehicleID]
	if !ok {
		c.mu.RUnlock()
		return nil
	}
	candidates := make([]*ringBuf, 0, len(vm))
	for name, rb := range vm {
		if Matches(name, subs) {
			candidates = append(candidates, rb)
		}
	}
	c.mu.RUnlock()

	var out []mapache.Signal
	for _, rb := range candidates {
		out = append(out, rb.snapshot(since)...)
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].CreatedAt.Before(out[j].CreatedAt)
	})
	return out
}

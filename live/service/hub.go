package service

import (
	"fmt"
	"path"
	"strings"
	"sync"
	"sync/atomic"

	mapache "github.com/gaucho-racing/mapache/mapache-go/v3"
)

// Client is the hub-side handle for a connected consumer. Transport layers
// (WS, SSE) own the actual connection and just drain Send. Send is buffered;
// dispatch silently drops when full so a slow client can't backpressure the
// hub or other subscribers.
type Client struct {
	ID   string
	Send chan mapache.Signal

	// seq is the dispatch-dedup marker: Publish stamps it with the current
	// publish epoch right before sending, so a client matching a signal via
	// both an exact name and a pattern (or multiple patterns) receives it
	// once. Touched only by Publish, which is serialized by Hub.pubMu, so it
	// needs no atomic.
	seq uint64
}

// patternBucket is one glob pattern and its (immutable) subscriber slice.
type patternBucket struct {
	pattern string
	clients []*Client
}

// vehicleSnap is the immutable per-vehicle subscriber snapshot. Once stored in
// the Hub it is never mutated; writers build a new one and swap it in. This is
// what lets Publish read without locking against connection churn.
type vehicleSnap struct {
	// exact[signalName] = immutable subscriber slice
	exact map[string][]*Client
	// patterns holds raw glob buckets, matched with path.Match on each Publish.
	patterns []patternBucket
}

// Hub is the package-global signal router. Transport handlers register
// Clients with a vehicle + set of signal names/patterns; Publish routes
// incoming signals to every matching client.
//
// Concurrency model:
//   - vehicles holds an immutable snapshot map behind an atomic pointer.
//     Publish loads it lock-free and never blocks, so connection churn cannot
//     stall signal dispatch.
//   - writeMu serializes Subscribe/Unsubscribe, which copy-on-write a new
//     snapshot and swap it in. Writers pay an O(subscribers-on-the-affected-
//     signal) copy, kept off the hot dispatch path.
//   - pubMu serializes publishers so the per-Client seq dedup marker is safe.
//     There is one publisher (the MQTT callback), so it is uncontended.
type Hub struct {
	writeMu  sync.Mutex
	vehicles atomic.Pointer[map[string]*vehicleSnap]

	pubMu  sync.Mutex
	pubSeq uint64
}

var Signals *Hub

func init() {
	Signals = NewHub()
}

func NewHub() *Hub {
	h := &Hub{}
	empty := make(map[string]*vehicleSnap)
	h.vehicles.Store(&empty)
	return h
}

// isPattern reports whether name contains a glob metacharacter. Anything
// without one goes through the O(1) exact map.
func isPattern(name string) bool {
	return strings.ContainsAny(name, "*?[")
}

// ValidatePatterns runs each pattern through path.Match against a sentinel
// to surface ErrBadPattern early, before the client connects. Returns the
// first invalid pattern, if any.
func ValidatePatterns(names []string) error {
	for _, n := range names {
		if !isPattern(n) {
			continue
		}
		if _, err := path.Match(n, "x"); err != nil {
			return fmt.Errorf("invalid pattern %q: %w", n, err)
		}
	}
	return nil
}

// cloneVehicles shallow-copies the snapshot map. Entries (vehicleSnap
// pointers) are shared; callers replace whole entries, never mutate them.
func cloneVehicles(cur *map[string]*vehicleSnap) map[string]*vehicleSnap {
	next := make(map[string]*vehicleSnap, len(*cur)+1)
	for k, v := range *cur {
		next[k] = v
	}
	return next
}

// cloneSnap copies a vehicleSnap's containers (exact map header + patterns
// slice). The inner client slices are shared and treated as immutable —
// modifications replace the whole slice via appendClient/removeClient.
func cloneSnap(vs *vehicleSnap) *vehicleSnap {
	n := &vehicleSnap{exact: make(map[string][]*Client)}
	if vs != nil {
		for k, v := range vs.exact {
			n.exact[k] = v
		}
		n.patterns = append([]patternBucket(nil), vs.patterns...)
	}
	return n
}

// appendClient returns old with client added, copying so the original
// (possibly published) slice is never mutated. A no-op if already present.
func appendClient(old []*Client, client *Client) []*Client {
	for _, c := range old {
		if c == client {
			return old
		}
	}
	n := make([]*Client, len(old)+1)
	copy(n, old)
	n[len(old)] = client
	return n
}

// removeClient returns old without client (copying) and whether it changed.
func removeClient(old []*Client, client *Client) ([]*Client, bool) {
	idx := -1
	for i, c := range old {
		if c == client {
			idx = i
			break
		}
	}
	if idx < 0 {
		return old, false
	}
	n := make([]*Client, 0, len(old)-1)
	n = append(n, old[:idx]...)
	n = append(n, old[idx+1:]...)
	return n, true
}

func (h *Hub) Subscribe(vehicleID string, names []string, client *Client) {
	h.writeMu.Lock()
	defer h.writeMu.Unlock()

	next := cloneVehicles(h.vehicles.Load())
	vs := cloneSnap(next[vehicleID])

	for _, name := range names {
		if isPattern(name) {
			found := false
			for i := range vs.patterns {
				if vs.patterns[i].pattern == name {
					vs.patterns[i].clients = appendClient(vs.patterns[i].clients, client)
					found = true
					break
				}
			}
			if !found {
				vs.patterns = append(vs.patterns, patternBucket{
					pattern: name,
					clients: []*Client{client},
				})
			}
			continue
		}
		vs.exact[name] = appendClient(vs.exact[name], client)
	}

	next[vehicleID] = vs
	h.vehicles.Store(&next)
}

func (h *Hub) Unsubscribe(vehicleID string, names []string, client *Client) {
	h.writeMu.Lock()
	defer h.writeMu.Unlock()

	cur := h.vehicles.Load()
	if (*cur)[vehicleID] == nil {
		return
	}
	next := cloneVehicles(cur)
	vs := cloneSnap(next[vehicleID])

	for _, name := range names {
		if isPattern(name) {
			for i := range vs.patterns {
				if vs.patterns[i].pattern != name {
					continue
				}
				if remaining, _ := removeClient(vs.patterns[i].clients, client); len(remaining) == 0 {
					vs.patterns = append(vs.patterns[:i], vs.patterns[i+1:]...)
				} else {
					vs.patterns[i].clients = remaining
				}
				break
			}
			continue
		}
		if remaining, changed := removeClient(vs.exact[name], client); changed {
			if len(remaining) == 0 {
				delete(vs.exact, name)
			} else {
				vs.exact[name] = remaining
			}
		}
	}

	if len(vs.exact) == 0 && len(vs.patterns) == 0 {
		delete(next, vehicleID)
	} else {
		next[vehicleID] = vs
	}
	h.vehicles.Store(&next)
}

// Publish dispatches signal to every client subscribed to its vehicle that
// either named it exactly or registered a matching glob pattern. The same
// client receiving via both routes is deduped — it gets the signal once.
//
// Reads the subscriber snapshot lock-free, so it is never blocked by
// connection churn. The non-blocking send drops for any client whose buffer
// is full, so a slow consumer cannot backpressure the hub.
func (h *Hub) Publish(signal mapache.Signal) {
	vs := (*h.vehicles.Load())[signal.VehicleID]
	if vs == nil {
		return
	}

	h.pubMu.Lock()
	defer h.pubMu.Unlock()

	// pubSeq is always >= 1, so a freshly created Client (seq == 0) is never
	// mistaken for already-sent.
	h.pubSeq++
	seq := h.pubSeq

	send := func(c *Client) {
		if c.seq == seq {
			return
		}
		c.seq = seq
		select {
		case c.Send <- signal:
		default:
		}
	}

	for _, c := range vs.exact[signal.Name] {
		send(c)
	}
	for i := range vs.patterns {
		ok, err := path.Match(vs.patterns[i].pattern, signal.Name)
		if err != nil || !ok {
			continue
		}
		for _, c := range vs.patterns[i].clients {
			send(c)
		}
	}
}

// Matches reports whether name would route to a subscriber that registered
// any of the given names/patterns. Used by the cache snapshot path.
func Matches(name string, subs []string) bool {
	for _, s := range subs {
		if !isPattern(s) {
			if s == name {
				return true
			}
			continue
		}
		if ok, err := path.Match(s, name); err == nil && ok {
			return true
		}
	}
	return false
}

// Stats returns a coarse snapshot of subscription counts for /ping-style
// observability. Reads the snapshot lock-free.
func (h *Hub) Stats() (vehicles, exactSubs, patternSubs int) {
	m := *h.vehicles.Load()
	for _, vs := range m {
		vehicles++
		for _, set := range vs.exact {
			exactSubs += len(set)
		}
		for i := range vs.patterns {
			patternSubs += len(vs.patterns[i].clients)
		}
	}
	return vehicles, exactSubs, patternSubs
}

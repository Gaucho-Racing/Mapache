package service

import (
	"fmt"
	"path"
	"strings"
	"sync"

	mapache "github.com/gaucho-racing/mapache/mapache-go/v3"
)

// Client is the hub-side handle for a connected consumer. Transport layers
// (WS, SSE) own the actual connection and just drain Send. Send is buffered;
// dispatch silently drops when full so a slow client can't backpressure the
// hub or other subscribers.
type Client struct {
	ID   string
	Send chan mapache.Signal
}

// Hub is the package-global signal router. Transport handlers register
// Clients with a vehicle + set of signal names/patterns; Publish routes
// incoming signals to every matching client.
type Hub struct {
	mu sync.RWMutex
	// exact[vehicleID][signalName] = subscriber set
	exact map[string]map[string]map[*Client]struct{}
	// patterns[vehicleID][rawPattern] = subscriber set. Patterns are
	// raw glob strings (e.g. "ecu_*", "*_status", "*"); matched with
	// path.Match on each Publish.
	patterns map[string]map[string]map[*Client]struct{}
}

var Signals *Hub

func init() {
	Signals = NewHub()
}

func NewHub() *Hub {
	return &Hub{
		exact:    make(map[string]map[string]map[*Client]struct{}),
		patterns: make(map[string]map[string]map[*Client]struct{}),
	}
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

func (h *Hub) Subscribe(vehicleID string, names []string, client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for _, name := range names {
		if isPattern(name) {
			if h.patterns[vehicleID] == nil {
				h.patterns[vehicleID] = make(map[string]map[*Client]struct{})
			}
			if h.patterns[vehicleID][name] == nil {
				h.patterns[vehicleID][name] = make(map[*Client]struct{})
			}
			h.patterns[vehicleID][name][client] = struct{}{}
			continue
		}
		if h.exact[vehicleID] == nil {
			h.exact[vehicleID] = make(map[string]map[*Client]struct{})
		}
		if h.exact[vehicleID][name] == nil {
			h.exact[vehicleID][name] = make(map[*Client]struct{})
		}
		h.exact[vehicleID][name][client] = struct{}{}
	}
}

func (h *Hub) Unsubscribe(vehicleID string, names []string, client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for _, name := range names {
		if isPattern(name) {
			if pats, ok := h.patterns[vehicleID]; ok {
				if set, ok := pats[name]; ok {
					delete(set, client)
					if len(set) == 0 {
						delete(pats, name)
					}
				}
				if len(pats) == 0 {
					delete(h.patterns, vehicleID)
				}
			}
			continue
		}
		if ex, ok := h.exact[vehicleID]; ok {
			if set, ok := ex[name]; ok {
				delete(set, client)
				if len(set) == 0 {
					delete(ex, name)
				}
			}
			if len(ex) == 0 {
				delete(h.exact, vehicleID)
			}
		}
	}
}

// Publish dispatches signal to every client subscribed to its vehicle that
// either named it exactly or registered a matching glob pattern. The same
// client receiving via both routes is deduped — it gets the signal once.
func (h *Hub) Publish(signal mapache.Signal) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	sent := make(map[*Client]struct{})
	dispatch := func(clients map[*Client]struct{}) {
		for c := range clients {
			if _, dup := sent[c]; dup {
				continue
			}
			sent[c] = struct{}{}
			select {
			case c.Send <- signal:
			default:
			}
		}
	}

	if ex, ok := h.exact[signal.VehicleID]; ok {
		if clients, ok := ex[signal.Name]; ok {
			dispatch(clients)
		}
	}
	if pats, ok := h.patterns[signal.VehicleID]; ok {
		for pattern, clients := range pats {
			// path.Match parses each call, but with realistic pattern
			// counts (low tens) the cost is negligible vs the win of
			// not having to maintain a compiled-matcher cache.
			ok, err := path.Match(pattern, signal.Name)
			if err != nil || !ok {
				continue
			}
			dispatch(clients)
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
// observability. Cheap enough to call inline.
func (h *Hub) Stats() (vehicles, exactSubs, patternSubs int) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	seen := make(map[string]struct{})
	for v, m := range h.exact {
		seen[v] = struct{}{}
		for _, set := range m {
			exactSubs += len(set)
		}
	}
	for v, m := range h.patterns {
		seen[v] = struct{}{}
		for _, set := range m {
			patternSubs += len(set)
		}
	}
	return len(seen), exactSubs, patternSubs
}

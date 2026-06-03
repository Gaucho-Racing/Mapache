// Package kerbecs resolves gateway-form paths (e.g. /vehicles/{id}) to the
// concrete upstream URL by asking the kerbecs gateway's admin /admin-gw/resolve
// endpoint. Mirrors the pattern from Sentinel — kerbecs is the routing source
// of truth, so we ask it where a request should go and cache the answer.
package kerbecs

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

const cacheTTL = 5 * time.Minute

var (
	endpoint string
	user     string
	password string
	client   = &http.Client{Timeout: 5 * time.Second}
)

type entry struct {
	url string
	exp time.Time
}

var (
	mu    sync.RWMutex
	cache = map[string]entry{}
)

// Init configures the resolver against the kerbecs admin API. No connection is
// made here — lookups happen lazily on first Resolve.
func Init(adminEndpoint, adminUser, adminPassword string) {
	endpoint = strings.TrimRight(adminEndpoint, "/")
	user = adminUser
	password = adminPassword
	go sweep()
}

type resolveResponse struct {
	Matched       bool   `json:"matched"`
	URL           string `json:"url"`
	RewrittenPath string `json:"rewritten_path"`
}

// Resolve maps a gateway-form path and HTTP method to the full upstream URL.
// Answers are cached for cacheTTL.
func Resolve(method, path string) (string, error) {
	if endpoint == "" {
		return "", fmt.Errorf("kerbecs resolver not initialized")
	}
	key := method + " " + path

	mu.RLock()
	if e, ok := cache[key]; ok && time.Now().Before(e.exp) {
		mu.RUnlock()
		return e.url, nil
	}
	mu.RUnlock()

	q := url.Values{}
	q.Set("path", path)
	q.Set("method", method)
	req, err := http.NewRequest(http.MethodGet, endpoint+"/admin-gw/resolve?"+q.Encode(), nil)
	if err != nil {
		return "", fmt.Errorf("resolve %s: %w", path, err)
	}
	req.SetBasicAuth(user, password)

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("resolve %s: %w", path, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return "", fmt.Errorf("no upstream registered for %s", path)
	}
	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("resolve %s: kerbecs returned %d", path, resp.StatusCode)
	}

	var rr resolveResponse
	if err := json.NewDecoder(resp.Body).Decode(&rr); err != nil {
		return "", fmt.Errorf("resolve %s: decode: %w", path, err)
	}
	if !rr.Matched {
		return "", fmt.Errorf("no upstream registered for %s", path)
	}

	full := strings.TrimRight(rr.URL, "/") + rr.RewrittenPath
	mu.Lock()
	cache[key] = entry{url: full, exp: time.Now().Add(cacheTTL)}
	mu.Unlock()
	return full, nil
}

func sweep() {
	for range time.Tick(cacheTTL) {
		now := time.Now()
		mu.Lock()
		for k, e := range cache {
			if now.After(e.exp) {
				delete(cache, k)
			}
		}
		mu.Unlock()
	}
}

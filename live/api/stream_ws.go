package api

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gaucho-racing/mapache/live/config"
	"github.com/gaucho-racing/mapache/live/service"

	mapache "github.com/gaucho-racing/mapache/mapache-go/v3"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

const (
	// pongWait is how long we wait for a pong before declaring the connection
	// dead and reaping it. pingPeriod must be comfortably less than pongWait.
	pongWait   = 60 * time.Second
	pingPeriod = (pongWait * 9) / 10
)

// StreamSignalsWS streams live signals over a WebSocket. Subscription is
// fixed at connect time (URL params). The first frame is always a JSON
// array of backfill signals (possibly empty); every subsequent frame is a
// single Signal object — clients distinguish by Array.isArray.
//
//	GET /live/ws?vehicle_id=X&signals=motor_rpm,ecu_*&backfill=30&rate=10
//
// signals: comma-separated, each entry is an exact name or a glob (path.Match
// rules: *, ?, [class]). backfill: seconds of history to replay before live
// (0..CacheWindowSec; default = full window). rate: optional max emit rate
// per signal name in Hz; coalesces to latest-value-per-name on each tick.
func StreamSignalsWS(c *gin.Context) {
	vehicleID := c.Query("vehicle_id")
	if vehicleID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "vehicle_id is required"})
		return
	}

	subs := parseSignals(c.Query("signals"))
	if len(subs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "signals is required"})
		return
	}
	if err := service.ValidatePatterns(subs); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	backfillSec := parseBackfill(c.Query("backfill"))
	rate := parseRate(c.Query("rate"))

	if !streamGate.acquire() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "server at connection capacity"})
		return
	}
	defer streamGate.release()

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	client := &service.Client{
		ID:   conn.RemoteAddr().String(),
		Send: make(chan mapache.Signal, 256),
	}

	// Subscribe BEFORE snapshotting so signals arriving during the
	// snapshot land in client.Send and get filtered by the suppress map
	// below — never lost.
	service.Signals.Subscribe(vehicleID, subs, client)
	defer service.Signals.Unsubscribe(vehicleID, subs, client)

	suppress := sendBackfillWS(conn, vehicleID, subs, backfillSec)

	// Reader goroutine — detects client disconnect and drives the heartbeat:
	// each pong (and any client frame) extends the read deadline, so a
	// half-open connection that stops responding is reaped after pongWait.
	done := make(chan struct{})
	go func() {
		defer close(done)
		conn.SetReadDeadline(time.Now().Add(pongWait))
		conn.SetPongHandler(func(string) error {
			return conn.SetReadDeadline(time.Now().Add(pongWait))
		})
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				return
			}
		}
	}()

	// Ping goroutine — keeps the connection live and surfaces dead peers.
	// WriteControl is safe to call concurrently with the WriteJSON in streamWS.
	go func() {
		ticker := time.NewTicker(pingPeriod)
		defer ticker.Stop()
		for {
			select {
			case <-done:
				return
			case <-ticker.C:
				deadline := time.Now().Add(time.Duration(config.WriteTimeoutSec) * time.Second)
				if err := conn.WriteControl(websocket.PingMessage, nil, deadline); err != nil {
					return
				}
			}
		}
	}()

	streamWS(conn, client, suppress, rate, done)
}

// sendBackfillWS writes the snapshot as a single JSON array frame and
// returns the suppress map (max CreatedAt per signal name) so the live
// stream can drop entries the snapshot already covered. Always sends the
// array, even empty — gives the client a deterministic boundary between
// backfill and live.
func sendBackfillWS(conn *websocket.Conn, vehicleID string, subs []string, backfillSec int) map[string]time.Time {
	var snap []mapache.Signal
	if backfillSec > 0 {
		since := time.Now().Add(-time.Duration(backfillSec) * time.Second)
		snap = service.Recent.Snapshot(vehicleID, subs, since)
	}
	if snap == nil {
		snap = []mapache.Signal{}
	}
	conn.SetWriteDeadline(time.Now().Add(time.Duration(config.WriteTimeoutSec) * time.Second))
	if err := conn.WriteJSON(snap); err != nil {
		return nil
	}
	suppress := make(map[string]time.Time, len(snap))
	for _, s := range snap {
		if t, ok := suppress[s.Name]; !ok || s.CreatedAt.After(t) {
			suppress[s.Name] = s.CreatedAt
		}
	}
	return suppress
}

func streamWS(conn *websocket.Conn, client *service.Client, suppress map[string]time.Time, rate int, done <-chan struct{}) {
	// Strict Before (not BeforeOrEqual) — at the boundary we may
	// double-send; clients dedup by signal ID. Better than dropping.
	keep := func(s mapache.Signal) bool {
		if max, ok := suppress[s.Name]; ok && s.CreatedAt.Before(max) {
			return false
		}
		return true
	}

	// writeJSON bounds every frame with a write deadline so a client that
	// stops draining its socket can't pin this goroutine forever.
	writeJSON := func(v any) error {
		conn.SetWriteDeadline(time.Now().Add(time.Duration(config.WriteTimeoutSec) * time.Second))
		return conn.WriteJSON(v)
	}

	if rate <= 0 {
		for {
			select {
			case <-done:
				return
			case sig, ok := <-client.Send:
				if !ok {
					return
				}
				if !keep(sig) {
					continue
				}
				if err := writeJSON(sig); err != nil {
					return
				}
			}
		}
	}

	// Coalesce by name and emit latest-per-name on each tick.
	ticker := time.NewTicker(time.Second / time.Duration(rate))
	defer ticker.Stop()
	pending := make(map[string]mapache.Signal)
	for {
		select {
		case <-done:
			return
		case sig, ok := <-client.Send:
			if !ok {
				return
			}
			if !keep(sig) {
				continue
			}
			pending[sig.Name] = sig
		case <-ticker.C:
			for _, s := range pending {
				if err := writeJSON(s); err != nil {
					return
				}
			}
			pending = make(map[string]mapache.Signal)
		}
	}
}

func parseSignals(raw string) []string {
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if s := strings.TrimSpace(p); s != "" {
			out = append(out, s)
		}
	}
	return out
}

func parseBackfill(raw string) int {
	if raw == "" {
		return config.CacheWindowSec
	}
	n, err := strconv.Atoi(raw)
	if err != nil || n < 0 {
		return config.CacheWindowSec
	}
	if n > config.CacheWindowSec {
		return config.CacheWindowSec
	}
	return n
}

func parseRate(raw string) int {
	if raw == "" {
		return 0
	}
	n, err := strconv.Atoi(raw)
	if err != nil || n < 1 {
		return 0
	}
	return n
}

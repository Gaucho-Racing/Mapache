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

	// Reader goroutine — only purpose is detecting client disconnect.
	// Anything the client sends is ignored (subs are fixed at connect).
	done := make(chan struct{})
	go func() {
		defer close(done)
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				return
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
				if err := conn.WriteJSON(sig); err != nil {
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
				if err := conn.WriteJSON(s); err != nil {
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

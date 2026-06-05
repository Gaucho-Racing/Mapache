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
// fixed at connect time (URL params). Initial backfill is read from the
// in-memory cache; live stream is then deduped against it per signal name.
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

// sendBackfillWS dumps the cache snapshot down the wire and returns the
// suppress map (max-timestamp per signal name) for the live stream to
// filter against.
func sendBackfillWS(conn *websocket.Conn, vehicleID string, subs []string, backfillSec int) map[string]int {
	if backfillSec <= 0 {
		return nil
	}
	sinceMicros := int(time.Now().UnixMicro()) - backfillSec*microsPerSecond
	snap := service.Recent.Snapshot(vehicleID, subs, sinceMicros)
	suppress := make(map[string]int, len(snap))
	for _, s := range snap {
		if err := conn.WriteJSON(s); err != nil {
			return suppress
		}
		if ts, ok := suppress[s.Name]; !ok || s.Timestamp > ts {
			suppress[s.Name] = s.Timestamp
		}
	}
	return suppress
}

func streamWS(conn *websocket.Conn, client *service.Client, suppress map[string]int, rate int, done <-chan struct{}) {
	// Suppress signals already covered by the backfill snapshot. Strict
	// `<` (not `<=`) so we may double-send at the boundary — clients
	// dedup by signal ID — but never miss.
	keep := func(s mapache.Signal) bool {
		if max, ok := suppress[s.Name]; ok && s.Timestamp < max {
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

const microsPerSecond = 1_000_000

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


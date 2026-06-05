package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gaucho-racing/mapache/live/service"

	mapache "github.com/gaucho-racing/mapache/mapache-go/v3"
	"github.com/gin-gonic/gin"
)

// StreamSignalsSSE streams live signals over Server-Sent Events.
//
//	GET /live/sse?vehicle_id=X&signals=motor_rpm,ecu_*&backfill=30
//
// The first event is `event: backfill` with the cached signals as a JSON
// array in `data:` (always sent, possibly empty). Each subsequent event is
// `event: signal` with a single Signal object. The `id` field on every
// event is the signal's CreatedAt in microseconds; browsers resend it as
// Last-Event-ID on reconnect, which we use as the resume cursor (overriding
// the backfill query param when present).
func StreamSignalsSSE(c *gin.Context) {
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

	// Last-Event-ID wins over the backfill param — it's the client telling
	// us exactly where they left off, no need to guess a window. Format
	// is CreatedAt as microseconds since epoch (set by the id: line on
	// every event we emit).
	var since time.Time
	if lid := c.GetHeader("Last-Event-ID"); lid != "" {
		if n, err := strconv.ParseInt(lid, 10, 64); err == nil && n > 0 {
			since = time.UnixMicro(n)
		}
	}
	if since.IsZero() && backfillSec > 0 {
		since = time.Now().Add(-time.Duration(backfillSec) * time.Second)
	}

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	// Disable proxy buffering (nginx/kerbecs) so events flush in real time.
	c.Header("X-Accel-Buffering", "no")
	c.Writer.WriteHeader(http.StatusOK)

	client := &service.Client{
		ID:   c.Request.RemoteAddr,
		Send: make(chan mapache.Signal, 256),
	}
	service.Signals.Subscribe(vehicleID, subs, client)
	defer service.Signals.Unsubscribe(vehicleID, subs, client)

	suppress := sendBackfillSSE(c, vehicleID, subs, since)
	c.Writer.Flush()

	ctx := c.Request.Context()
	for {
		select {
		case <-ctx.Done():
			return
		case sig, ok := <-client.Send:
			if !ok {
				return
			}
			if max, ok := suppress[sig.Name]; ok && sig.CreatedAt.Before(max) {
				continue
			}
			if !writeSSESignal(c, sig) {
				return
			}
			c.Writer.Flush()
		}
	}
}

// sendBackfillSSE emits one `event: backfill` with the snapshot as a JSON
// array and returns the suppress map for the live stream.
func sendBackfillSSE(c *gin.Context, vehicleID string, subs []string, since time.Time) map[string]time.Time {
	var snap []mapache.Signal
	if !since.IsZero() {
		snap = service.Recent.Snapshot(vehicleID, subs, since)
	}
	if snap == nil {
		snap = []mapache.Signal{}
	}
	payload, err := json.Marshal(snap)
	if err != nil {
		return nil
	}
	// id: line only when we have content — empty backfill shouldn't
	// move the client's Last-Event-ID cursor.
	suppress := make(map[string]time.Time, len(snap))
	var maxTS int64
	for _, s := range snap {
		if t, ok := suppress[s.Name]; !ok || s.CreatedAt.After(t) {
			suppress[s.Name] = s.CreatedAt
		}
		if m := s.CreatedAt.UnixMicro(); m > maxTS {
			maxTS = m
		}
	}
	if maxTS > 0 {
		fmt.Fprintf(c.Writer, "id: %d\n", maxTS)
	}
	fmt.Fprintf(c.Writer, "event: backfill\ndata: %s\n\n", payload)
	return suppress
}

func writeSSESignal(c *gin.Context, s mapache.Signal) bool {
	payload, err := json.Marshal(s)
	if err != nil {
		return true
	}
	_, err = fmt.Fprintf(c.Writer, "id: %d\nevent: signal\ndata: %s\n\n", s.CreatedAt.UnixMicro(), payload)
	return err == nil
}

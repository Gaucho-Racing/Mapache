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

// StreamSignalsSSE streams live signals over Server-Sent Events. The id
// field on each event is the signal's microsecond timestamp; browsers
// resend it as Last-Event-ID on reconnect, which we use as the backfill
// cursor (overriding the backfill query param when present).
//
//	GET /live/sse?vehicle_id=X&signals=motor_rpm,ecu_*&backfill=30
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
	// us exactly where they left off, no need to guess a window.
	sinceMicros := 0
	if lid := c.GetHeader("Last-Event-ID"); lid != "" {
		if n, err := strconv.Atoi(lid); err == nil && n > 0 {
			sinceMicros = n
		}
	}
	if sinceMicros == 0 && backfillSec > 0 {
		sinceMicros = int(time.Now().UnixMicro()) - backfillSec*microsPerSecond
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

	suppress := make(map[string]int)
	if sinceMicros > 0 {
		for _, s := range service.Recent.Snapshot(vehicleID, subs, sinceMicros) {
			if !writeSSESignal(c, s) {
				return
			}
			if ts, ok := suppress[s.Name]; !ok || s.Timestamp > ts {
				suppress[s.Name] = s.Timestamp
			}
		}
		c.Writer.Flush()
	}

	ctx := c.Request.Context()
	for {
		select {
		case <-ctx.Done():
			return
		case sig, ok := <-client.Send:
			if !ok {
				return
			}
			if max, ok := suppress[sig.Name]; ok && sig.Timestamp < max {
				continue
			}
			if !writeSSESignal(c, sig) {
				return
			}
			c.Writer.Flush()
		}
	}
}

func writeSSESignal(c *gin.Context, s mapache.Signal) bool {
	payload, err := json.Marshal(s)
	if err != nil {
		return true
	}
	_, err = fmt.Fprintf(c.Writer, "id: %d\nevent: signal\ndata: %s\n\n", s.Timestamp, payload)
	return err == nil
}

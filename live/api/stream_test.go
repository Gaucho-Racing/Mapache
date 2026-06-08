package api

import (
	"bufio"
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gaucho-racing/mapache/live/config"
	"github.com/gaucho-racing/mapache/live/service"

	mapache "github.com/gaucho-racing/mapache/mapache-go/v3"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

func testServer(t *testing.T, maxConns int) *httptest.Server {
	t.Helper()
	gin.SetMode(gin.TestMode)
	config.WriteTimeoutSec = 10
	config.CacheWindowSec = 60
	config.MaxConnections = maxConns
	service.InitCache(60 * time.Second)

	r := gin.New()
	InitializeRoutes(r)
	srv := httptest.NewServer(r)
	t.Cleanup(srv.Close)
	return srv
}

func sig(vehicle, name string) mapache.Signal {
	return mapache.Signal{VehicleID: vehicle, Name: name, Timestamp: int(time.Now().UnixMicro()), CreatedAt: time.Now()}
}

func TestSSEDeliversBackfillThenLive(t *testing.T) {
	srv := testServer(t, 10)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet,
		srv.URL+"/live/sse?vehicle_id=v1&signals=motor_rpm&backfill=0", nil)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("sse request: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status: want 200, got %d", resp.StatusCode)
	}

	r := bufio.NewReader(resp.Body)
	// First event must be the backfill boundary.
	if !readUntilEvent(t, r, "backfill") {
		t.Fatal("did not receive backfill event")
	}

	// Subscription is now active; publish a live signal and expect it through.
	service.Signals.Publish(sig("v1", "motor_rpm"))
	if !readUntilEvent(t, r, "signal") {
		t.Fatal("did not receive live signal event")
	}
}

func TestWSDeliversBackfillThenLive(t *testing.T) {
	srv := testServer(t, 10)
	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http") + "/live/ws?vehicle_id=v1&signals=motor_rpm&backfill=0"

	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("ws dial: %v", err)
	}
	defer conn.Close()

	// First frame is the backfill array (possibly empty).
	conn.SetReadDeadline(time.Now().Add(3 * time.Second))
	var backfill []mapache.Signal
	if err := conn.ReadJSON(&backfill); err != nil {
		t.Fatalf("read backfill: %v", err)
	}

	service.Signals.Publish(sig("v1", "motor_rpm"))

	conn.SetReadDeadline(time.Now().Add(3 * time.Second))
	var live mapache.Signal
	if err := conn.ReadJSON(&live); err != nil {
		t.Fatalf("read live signal: %v", err)
	}
	if live.Name != "motor_rpm" || live.VehicleID != "v1" {
		t.Fatalf("unexpected signal: %+v", live)
	}
}

func TestConnectionCapReturns503(t *testing.T) {
	srv := testServer(t, 1) // cap at 1

	// Hold one SSE connection open (occupies the only slot).
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet,
		srv.URL+"/live/sse?vehicle_id=v1&signals=motor_rpm&backfill=0", nil)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("first sse request: %v", err)
	}
	defer resp.Body.Close()
	// Drain past backfill so the handler has definitely acquired its slot.
	readUntilEvent(t, bufio.NewReader(resp.Body), "backfill")

	// Second connection must be shed.
	resp2, err := http.Get(srv.URL + "/live/sse?vehicle_id=v1&signals=motor_rpm&backfill=0")
	if err != nil {
		t.Fatalf("second sse request: %v", err)
	}
	defer resp2.Body.Close()
	if resp2.StatusCode != http.StatusServiceUnavailable {
		t.Fatalf("over-cap connection: want 503, got %d", resp2.StatusCode)
	}

	// Freeing the first slot lets a new connection in.
	cancel()
	resp.Body.Close()
	time.Sleep(100 * time.Millisecond)

	resp3, err := http.Get(srv.URL + "/live/sse?vehicle_id=v1&signals=motor_rpm&backfill=0")
	if err != nil {
		t.Fatalf("third sse request: %v", err)
	}
	defer resp3.Body.Close()
	if resp3.StatusCode != http.StatusOK {
		t.Fatalf("after release: want 200, got %d", resp3.StatusCode)
	}
}

// readUntilEvent scans SSE lines until it sees `event: <name>` or times out.
func readUntilEvent(t *testing.T, r *bufio.Reader, name string) bool {
	t.Helper()
	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		line, err := r.ReadString('\n')
		if err != nil {
			return false
		}
		if strings.TrimSpace(line) == "event: "+name {
			return true
		}
	}
	return false
}

package service

import (
	"fmt"
	"sync"
	"testing"
	"time"

	mapache "github.com/gaucho-racing/mapache/mapache-go/v3"
)

func newClient(id string, buf int) *Client {
	return &Client{ID: id, Send: make(chan mapache.Signal, buf)}
}

func sig(vehicle, name string) mapache.Signal {
	return mapache.Signal{VehicleID: vehicle, Name: name, Timestamp: 1, CreatedAt: time.Now()}
}

// drain returns how many signals are currently queued on the client.
func queued(c *Client) int { return len(c.Send) }

func TestExactDelivery(t *testing.T) {
	h := NewHub()
	c := newClient("c1", 4)
	h.Subscribe("v1", []string{"motor_rpm"}, c)

	h.Publish(sig("v1", "motor_rpm"))
	h.Publish(sig("v1", "other"))     // not subscribed
	h.Publish(sig("v2", "motor_rpm")) // wrong vehicle

	if got := queued(c); got != 1 {
		t.Fatalf("expected 1 delivered, got %d", got)
	}
}

func TestPatternDelivery(t *testing.T) {
	h := NewHub()
	c := newClient("c1", 8)
	h.Subscribe("v1", []string{"ecu_*"}, c)

	h.Publish(sig("v1", "ecu_temp"))
	h.Publish(sig("v1", "ecu_volts"))
	h.Publish(sig("v1", "motor_rpm")) // no match

	if got := queued(c); got != 2 {
		t.Fatalf("expected 2 delivered, got %d", got)
	}
}

func TestDedupAcrossExactAndPattern(t *testing.T) {
	h := NewHub()
	c := newClient("c1", 8)
	// Same client matches via exact name AND a glob — must receive once.
	h.Subscribe("v1", []string{"motor_rpm", "motor_*"}, c)

	h.Publish(sig("v1", "motor_rpm"))
	if got := queued(c); got != 1 {
		t.Fatalf("expected 1 (deduped), got %d", got)
	}
}

func TestDedupAcrossMultiplePatterns(t *testing.T) {
	h := NewHub()
	c := newClient("c1", 8)
	h.Subscribe("v1", []string{"ecu_*", "*_temp"}, c)

	h.Publish(sig("v1", "ecu_temp")) // matches both patterns
	if got := queued(c); got != 1 {
		t.Fatalf("expected 1 (deduped), got %d", got)
	}
}

func TestUnsubscribe(t *testing.T) {
	h := NewHub()
	c := newClient("c1", 4)
	h.Subscribe("v1", []string{"motor_rpm", "ecu_*"}, c)
	h.Unsubscribe("v1", []string{"motor_rpm", "ecu_*"}, c)

	h.Publish(sig("v1", "motor_rpm"))
	h.Publish(sig("v1", "ecu_temp"))
	if got := queued(c); got != 0 {
		t.Fatalf("expected 0 after unsubscribe, got %d", got)
	}

	v, e, p := h.Stats()
	if v != 0 || e != 0 || p != 0 {
		t.Fatalf("expected empty stats, got vehicles=%d exact=%d pattern=%d", v, e, p)
	}
}

func TestMultipleClientsFanout(t *testing.T) {
	h := NewHub()
	clients := make([]*Client, 50)
	for i := range clients {
		clients[i] = newClient(fmt.Sprintf("c%d", i), 4)
		h.Subscribe("v1", []string{"motor_rpm"}, clients[i])
	}
	h.Publish(sig("v1", "motor_rpm"))
	for i, c := range clients {
		if queued(c) != 1 {
			t.Fatalf("client %d: expected 1, got %d", i, queued(c))
		}
	}
}

func TestSlowClientDropsNotBlocks(t *testing.T) {
	h := NewHub()
	slow := newClient("slow", 2) // tiny buffer, never drained
	fast := newClient("fast", 100)
	h.Subscribe("v1", []string{"x"}, slow)
	h.Subscribe("v1", []string{"x"}, fast)

	for i := 0; i < 10; i++ {
		h.Publish(sig("v1", "x")) // must not block on slow's full buffer
	}
	if queued(slow) != 2 {
		t.Fatalf("slow client should cap at buffer=2, got %d", queued(slow))
	}
	if queued(fast) != 10 {
		t.Fatalf("fast client should get all 10, got %d", queued(fast))
	}
}

func TestStats(t *testing.T) {
	h := NewHub()
	h.Subscribe("v1", []string{"a", "b", "ecu_*"}, newClient("c1", 1))
	h.Subscribe("v1", []string{"a"}, newClient("c2", 1))
	h.Subscribe("v2", []string{"x"}, newClient("c3", 1))

	v, e, p := h.Stats()
	if v != 2 {
		t.Fatalf("vehicles: want 2, got %d", v)
	}
	if e != 4 { // v1: a(2)+b(1), v2: x(1)
		t.Fatalf("exactSubs: want 4, got %d", e)
	}
	if p != 1 {
		t.Fatalf("patternSubs: want 1, got %d", p)
	}
}

// TestConcurrentChurnRace hammers Subscribe/Unsubscribe from many goroutines
// while a publisher dispatches continuously. Run with -race: it must show no
// data race between lock-free dispatch and copy-on-write writers, and the
// service must not deadlock.
func TestConcurrentChurnRace(t *testing.T) {
	h := NewHub()
	stop := make(chan struct{})
	var wg sync.WaitGroup

	// Steady drained subscribers.
	steady := make([]*Client, 20)
	for i := range steady {
		steady[i] = newClient(fmt.Sprintf("s%d", i), 64)
		h.Subscribe("v1", []string{"motor_rpm", "ecu_*"}, steady[i])
		wg.Add(1)
		go func(c *Client) {
			defer wg.Done()
			for {
				select {
				case <-stop:
					return
				case <-c.Send:
				}
			}
		}(steady[i])
	}

	// Publisher.
	wg.Add(1)
	go func() {
		defer wg.Done()
		for {
			select {
			case <-stop:
				return
			default:
				h.Publish(sig("v1", "motor_rpm"))
				h.Publish(sig("v1", "ecu_temp"))
			}
		}
	}()

	// Churners.
	for g := 0; g < 8; g++ {
		wg.Add(1)
		go func(g int) {
			defer wg.Done()
			i := 0
			for {
				select {
				case <-stop:
					return
				default:
				}
				c := newClient(fmt.Sprintf("churn%d-%d", g, i), 8)
				h.Subscribe("v1", []string{"motor_rpm", "ecu_*"}, c)
				h.Unsubscribe("v1", []string{"motor_rpm", "ecu_*"}, c)
				i++
			}
		}(g)
	}

	time.Sleep(300 * time.Millisecond)
	close(stop)
	wg.Wait()

	// Steady subscribers must still be registered after all the churn.
	_, e, p := h.Stats()
	if e < len(steady) || p < len(steady) {
		t.Fatalf("steady subscribers lost during churn: exact=%d pattern=%d", e, p)
	}
}

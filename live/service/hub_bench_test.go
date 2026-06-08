package service

import (
	"fmt"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	mapache "github.com/gaucho-racing/mapache/mapache-go/v3"
)

const benchVehicle = "veh-bench"

func makeSignal(name string) mapache.Signal {
	now := time.Now()
	return mapache.Signal{
		ID:        "01HABCDEFGHJKMNPQRSTVWXYZ",
		Timestamp: int(now.UnixMicro()),
		VehicleID: benchVehicle,
		Name:      name,
		Value:     123.456,
		CreatedAt: now,
	}
}

// drainClient returns a client whose Send is continuously drained by a
// goroutine, so the non-blocking dispatch in Publish always succeeds (we're
// measuring dispatch cost, not the drop path). Caller must close stop.
func drainClient(id string, stop <-chan struct{}, wg *sync.WaitGroup) *Client {
	c := &Client{ID: id, Send: make(chan mapache.Signal, 256)}
	wg.Add(1)
	go func() {
		defer wg.Done()
		for {
			select {
			case <-stop:
				return
			case <-c.Send:
			}
		}
	}()
	return c
}

// BenchmarkPublishExactFanout measures the per-signal dispatch cost when N
// clients all subscribe to the same exact signal name — the hot-signal case
// (everyone watching the same gauge).
func BenchmarkPublishExactFanout(b *testing.B) {
	for _, n := range []int{1, 10, 100, 1000, 5000} {
		b.Run(fmt.Sprintf("clients=%d", n), func(b *testing.B) {
			h := NewHub()
			stop := make(chan struct{})
			var wg sync.WaitGroup
			for i := 0; i < n; i++ {
				h.Subscribe(benchVehicle, []string{"motor_rpm"}, drainClient(fmt.Sprintf("c%d", i), stop, &wg))
			}
			sig := makeSignal("motor_rpm")
			b.ResetTimer()
			for i := 0; i < b.N; i++ {
				h.Publish(sig)
			}
			b.StopTimer()
			close(stop)
			wg.Wait()
		})
	}
}

// BenchmarkPublishPatternFanout measures dispatch when each client registers a
// distinct glob pattern, so every Publish runs path.Match against every
// pattern. Worst case for the pattern loop.
func BenchmarkPublishPatternFanout(b *testing.B) {
	for _, n := range []int{10, 100, 1000} {
		b.Run(fmt.Sprintf("patterns=%d", n), func(b *testing.B) {
			h := NewHub()
			stop := make(chan struct{})
			var wg sync.WaitGroup
			for i := 0; i < n; i++ {
				pat := fmt.Sprintf("ecu_%d_*", i)
				h.Subscribe(benchVehicle, []string{pat}, drainClient(fmt.Sprintf("c%d", i), stop, &wg))
			}
			// Matches exactly one pattern (ecu_0_*), but must test all n.
			sig := makeSignal("ecu_0_temp")
			b.ResetTimer()
			for i := 0; i < b.N; i++ {
				h.Publish(sig)
			}
			b.StopTimer()
			close(stop)
			wg.Wait()
		})
	}
}

// BenchmarkPublishUnderChurn is the key test: it measures dispatch latency
// while a separate goroutine continuously Subscribe/Unsubscribes, simulating
// connection churn at scale. Because Subscribe/Unsubscribe take the exclusive
// hub lock and Publish takes the read lock, this surfaces how much churn
// stalls the (single) dispatch goroutine. Reports max and mean Publish latency.
func BenchmarkPublishUnderChurn(b *testing.B) {
	h := NewHub()
	stop := make(chan struct{})
	var wg sync.WaitGroup

	// Steady-state subscribers so dispatch has real work to do.
	for i := 0; i < 500; i++ {
		h.Subscribe(benchVehicle, []string{"motor_rpm"}, drainClient(fmt.Sprintf("steady%d", i), stop, &wg))
	}

	// Churn goroutines: connect+disconnect as fast as possible.
	var churnOps atomic.Int64
	churners := 8
	for g := 0; g < churners; g++ {
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
				c := &Client{ID: fmt.Sprintf("churn%d-%d", g, i), Send: make(chan mapache.Signal, 1)}
				h.Subscribe(benchVehicle, []string{"motor_rpm"}, c)
				h.Unsubscribe(benchVehicle, []string{"motor_rpm"}, c)
				churnOps.Add(1)
				i++
			}
		}(g)
	}

	sig := makeSignal("motor_rpm")
	var maxNs, sumNs int64
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		t0 := time.Now()
		h.Publish(sig)
		d := time.Since(t0).Nanoseconds()
		sumNs += d
		if d > maxNs {
			maxNs = d
		}
	}
	b.StopTimer()
	close(stop)
	wg.Wait()

	if b.N > 0 {
		b.ReportMetric(float64(sumNs)/float64(b.N), "mean-ns/publish")
		b.ReportMetric(float64(maxNs), "max-ns/publish")
		b.ReportMetric(float64(churnOps.Load()), "churn-ops")
	}
}

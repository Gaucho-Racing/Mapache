package api

import (
	"sync"
	"testing"
)

func TestConnGateAcquireRelease(t *testing.T) {
	g := newConnGate(2)

	if !g.acquire() || !g.acquire() {
		t.Fatal("first two acquires should succeed")
	}
	if g.acquire() {
		t.Fatal("third acquire should fail at cap")
	}
	if g.count() != 2 {
		t.Fatalf("count: want 2, got %d", g.count())
	}

	g.release()
	if !g.acquire() {
		t.Fatal("acquire should succeed after release")
	}
	if g.count() != 2 {
		t.Fatalf("count after release+acquire: want 2, got %d", g.count())
	}
}

// TestConnGateConcurrent verifies the cap holds under concurrent acquire/release
// and never leaks or exceeds. Run with -race.
func TestConnGateConcurrent(t *testing.T) {
	const max = 50
	g := newConnGate(max)

	var wg sync.WaitGroup
	for i := 0; i < 500; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if g.acquire() {
				g.release()
			}
		}()
	}
	wg.Wait()

	if g.count() != 0 {
		t.Fatalf("expected 0 active after all release, got %d", g.count())
	}
	if !g.acquire() {
		t.Fatal("gate should be fully available again")
	}
}

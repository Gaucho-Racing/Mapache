package mapache

import (
	"testing"
	"time"
)

func TestVehicle_TableName(t *testing.T) {
	v := Vehicle{}
	if v.TableName() != "vehicle" {
		t.Error("Expected vehicle, got", v.TableName())
	}
}

func TestSession_TableName(t *testing.T) {
	s := Session{}
	if s.TableName() != "session" {
		t.Error("Expected session, got", s.TableName())
	}
}

func TestMarker_TableName(t *testing.T) {
	m := Marker{}
	if m.TableName() != "session_marker" {
		t.Error("Expected session_marker, got", m.TableName())
	}
}

func TestDeriveSegments_NoMarkers(t *testing.T) {
	start := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 1, 1, 1, 0, 0, 0, time.UTC)
	session := Session{StartTime: start, EndTime: end}

	segments := DeriveSegments(session)
	if len(segments) != 1 {
		t.Fatalf("Expected 1 segment, got %d", len(segments))
	}
	if segments[0].Number != 1 {
		t.Errorf("Expected segment number 1, got %d", segments[0].Number)
	}
	if !segments[0].StartTime.Equal(start) || !segments[0].EndTime.Equal(end) {
		t.Error("Segment should span full session")
	}
}

func TestDeriveSegments_OneMarker(t *testing.T) {
	start := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	mid := time.Date(2026, 1, 1, 0, 30, 0, 0, time.UTC)
	end := time.Date(2026, 1, 1, 1, 0, 0, 0, time.UTC)
	session := Session{
		StartTime: start,
		EndTime:   end,
		Markers:   []Marker{{Timestamp: mid}},
	}

	segments := DeriveSegments(session)
	if len(segments) != 2 {
		t.Fatalf("Expected 2 segments, got %d", len(segments))
	}
	if segments[0].Number != 1 || segments[1].Number != 2 {
		t.Error("Segment numbers should be 1-indexed")
	}
	if !segments[0].StartTime.Equal(start) || !segments[0].EndTime.Equal(mid) {
		t.Error("First segment bounds incorrect")
	}
	if !segments[1].StartTime.Equal(mid) || !segments[1].EndTime.Equal(end) {
		t.Error("Second segment bounds incorrect")
	}
}

func TestDeriveSegments_MultipleMarkers(t *testing.T) {
	start := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	m1 := time.Date(2026, 1, 1, 0, 10, 0, 0, time.UTC)
	m2 := time.Date(2026, 1, 1, 0, 20, 0, 0, time.UTC)
	m3 := time.Date(2026, 1, 1, 0, 30, 0, 0, time.UTC)
	end := time.Date(2026, 1, 1, 1, 0, 0, 0, time.UTC)

	// Intentionally out of order to test sorting
	session := Session{
		StartTime: start,
		EndTime:   end,
		Markers: []Marker{
			{Timestamp: m3},
			{Timestamp: m1},
			{Timestamp: m2},
		},
	}

	segments := DeriveSegments(session)
	if len(segments) != 4 {
		t.Fatalf("Expected 4 segments, got %d", len(segments))
	}
	for i, seg := range segments {
		if seg.Number != i+1 {
			t.Errorf("Segment %d has number %d, expected %d", i, seg.Number, i+1)
		}
	}
	if !segments[0].StartTime.Equal(start) || !segments[0].EndTime.Equal(m1) {
		t.Error("Segment 1 bounds incorrect")
	}
	if !segments[1].StartTime.Equal(m1) || !segments[1].EndTime.Equal(m2) {
		t.Error("Segment 2 bounds incorrect")
	}
	if !segments[2].StartTime.Equal(m2) || !segments[2].EndTime.Equal(m3) {
		t.Error("Segment 3 bounds incorrect")
	}
	if !segments[3].StartTime.Equal(m3) || !segments[3].EndTime.Equal(end) {
		t.Error("Segment 4 bounds incorrect")
	}
}

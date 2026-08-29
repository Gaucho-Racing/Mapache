package dbc

import (
	"math"
	"testing"
)

func TestExtractLittleEndian(t *testing.T) {
	// 13 bits starting at bit 2. Raw 1000 shifted left 2 is 4000 =
	// 0x0FA0, which little-endian is byte0=0xA0 byte1=0x0F.
	data := []byte{0xA0, 0x0F, 0, 0, 0, 0, 0, 0}
	got, ok := extractLittleEndian(data, 2, 13)
	if !ok {
		t.Fatal("extract reported the signal does not fit")
	}
	if got != 1000 {
		t.Errorf("raw = %d, want 1000", got)
	}
}

func TestExtractLittleEndianSingleBit(t *testing.T) {
	data := []byte{0b0000_1000}
	if got, _ := extractLittleEndian(data, 3, 1); got != 1 {
		t.Errorf("bit 3 = %d, want 1", got)
	}
	if got, _ := extractLittleEndian(data, 2, 1); got != 0 {
		t.Errorf("bit 2 = %d, want 0", got)
	}
}

// Motorola order walks down within a byte then resumes at the top of the
// next, so a 16-bit signal starting at bit 7 reads the bytes big-endian.
func TestExtractBigEndian(t *testing.T) {
	got, ok := extractBigEndian([]byte{0x12, 0x34}, 7, 16)
	if !ok {
		t.Fatal("extract reported the signal does not fit")
	}
	if got != 0x1234 {
		t.Errorf("raw = %#x, want 0x1234", got)
	}
}

func TestExtractRejectsOverrun(t *testing.T) {
	if _, ok := extractLittleEndian([]byte{0xFF}, 4, 8); ok {
		t.Error("a signal running past the frame should not extract")
	}
	if _, ok := extractLittleEndian([]byte{0xFF}, 0, 8); !ok {
		t.Error("a signal exactly filling the frame should extract")
	}
}

func TestSignExtension(t *testing.T) {
	// 6 bits at bit 57 (byte 7, bit 1). All ones is -1 two's complement.
	data := []byte{0, 0, 0, 0, 0, 0, 0, 0x7E}
	s := Signal{StartBit: 57, Length: 6, LittleEndian: true, Signed: true}
	raw, ok := s.extract(data)
	if !ok {
		t.Fatal("extract failed")
	}
	if raw != -1 {
		t.Errorf("raw = %d, want -1", raw)
	}

	unsigned := Signal{StartBit: 57, Length: 6, LittleEndian: true}
	if raw, _ := unsigned.extract(data); raw != 63 {
		t.Errorf("unsigned raw = %d, want 63", raw)
	}
}

func TestDecodeAppliesScaling(t *testing.T) {
	msg := &Message{
		ID: 1, Name: "T", Length: 8,
		Signals: []Signal{
			{Name: "angle", StartBit: 2, Length: 13, LittleEndian: true, Factor: 0.175, Unit: "deg"},
			{Name: "temp", StartBit: 57, Length: 6, LittleEndian: true, Signed: true, Factor: 1, Offset: -48, Unit: "C"},
		},
	}
	data := []byte{0xA0, 0x0F, 0, 0, 0, 0, 0, 0x7E}

	got := msg.Decode(data)
	if len(got) != 2 {
		t.Fatalf("decoded %d signals, want 2", len(got))
	}
	if math.Abs(got[0].Value-175.0) > 1e-9 {
		t.Errorf("angle = %v, want 175", got[0].Value)
	}
	if got[0].Raw != 1000 {
		t.Errorf("angle raw = %d, want 1000", got[0].Raw)
	}
	// -1 raw with offset -48.
	if math.Abs(got[1].Value-(-49)) > 1e-9 {
		t.Errorf("temp = %v, want -49", got[1].Value)
	}
}

func TestDecodeSkipsMultiplexed(t *testing.T) {
	msg := &Message{
		ID: 1, Length: 8,
		Signals: []Signal{
			{Name: "muxed", StartBit: 0, Length: 8, LittleEndian: true, Factor: 1, Multiplexed: true},
			{Name: "plain", StartBit: 8, Length: 8, LittleEndian: true, Factor: 1},
		},
	}
	got := msg.Decode([]byte{0xAA, 0xBB, 0, 0, 0, 0, 0, 0})
	if len(got) != 1 {
		t.Fatalf("decoded %d signals, want 1 (multiplexed skipped)", len(got))
	}
	if got[0].Name != "plain" || got[0].Raw != 0xBB {
		t.Errorf("decoded %+v, want plain=0xBB", got[0])
	}
}

func TestDecodeSkipsSignalsPastEndOfFrame(t *testing.T) {
	msg := &Message{
		ID: 1, Length: 8,
		Signals: []Signal{
			{Name: "fits", StartBit: 0, Length: 8, LittleEndian: true, Factor: 1},
			{Name: "overruns", StartBit: 8, Length: 16, LittleEndian: true, Factor: 1},
		},
	}
	// Two bytes only: the second signal cannot be read. A zero would be
	// indistinguishable from a real reading, so it must be absent.
	got := msg.Decode([]byte{0x11, 0x22})
	if len(got) != 1 || got[0].Name != "fits" {
		t.Errorf("decoded %+v, want only the signal that fits", got)
	}
}

// Decode every message in the real DBC against a frame of its declared
// length. Nothing should panic, and every non-multiplexed signal that fits
// should produce a value.
func TestDecodeEmbeddedCaymanMessages(t *testing.T) {
	db, err := Cayman987()
	if err != nil {
		t.Fatalf("Cayman987: %v", err)
	}
	for id, msg := range db.Messages {
		data := make([]byte, msg.Length)
		for i := range data {
			data[i] = 0xA5
		}
		got := msg.Decode(data)

		want := 0
		for _, s := range msg.Signals {
			if !s.Multiplexed {
				want++
			}
		}
		if len(got) != want {
			t.Errorf("0x%X (%s) decoded %d signals, want %d", id, msg.Name, len(got), want)
		}
	}
}

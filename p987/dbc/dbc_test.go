package dbc

import (
	"strings"
	"testing"
)

const sampleDBC = `
BO_ 194 SCCM1: 8 SCCM
 SG_ SCCM_SteeringAngleSign : 15|1@1+ (1,0) [0|1] "" SCCM
 SG_ SCCM_SteeringAngle : 2|13@1+ (0.175,0) [0|0] "deg" SCCM

BO_ 581 DME_Signed: 8 DME
 SG_ DME_EngineCompTemp : 57|6@1- (1,-48) [-48|15] "degC" DME

BO_ 582 DME_Muxed: 8 DME
 SG_ DME2_MUL_Code m0 : 0|6@1+ (1,0) [0|63] "" DME
 SG_ DME_Plain : 8|8@1+ (1,0) [0|255] "" DME
`

func TestParse(t *testing.T) {
	db, err := Parse(strings.NewReader(sampleDBC))
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}

	if len(db.Messages) != 3 {
		t.Fatalf("message count = %d, want 3", len(db.Messages))
	}

	msg, ok := db.Messages[194]
	if !ok {
		t.Fatal("message 194 missing")
	}
	if msg.Name != "SCCM1" || msg.Length != 8 {
		t.Errorf("message 194 = %q len %d, want SCCM1 len 8", msg.Name, msg.Length)
	}
	if len(msg.Signals) != 2 {
		t.Fatalf("message 194 signal count = %d, want 2", len(msg.Signals))
	}

	angle := msg.Signals[1]
	if angle.Name != "SCCM_SteeringAngle" {
		t.Errorf("signal name = %q", angle.Name)
	}
	if angle.StartBit != 2 || angle.Length != 13 {
		t.Errorf("signal placement = %d|%d, want 2|13", angle.StartBit, angle.Length)
	}
	if !angle.LittleEndian || angle.Signed {
		t.Errorf("signal byte order/sign = little:%v signed:%v, want little:true signed:false", angle.LittleEndian, angle.Signed)
	}
	if angle.Factor != 0.175 || angle.Offset != 0 {
		t.Errorf("scaling = (%v,%v), want (0.175,0)", angle.Factor, angle.Offset)
	}
	if angle.Unit != "deg" {
		t.Errorf("unit = %q, want deg", angle.Unit)
	}
}

func TestParseSignedAndNegativeOffset(t *testing.T) {
	db, err := Parse(strings.NewReader(sampleDBC))
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	s := db.Messages[581].Signals[0]
	if !s.Signed {
		t.Error("DME_EngineCompTemp should be signed")
	}
	if s.Offset != -48 {
		t.Errorf("offset = %v, want -48", s.Offset)
	}
}

func TestParseMarksMultiplexed(t *testing.T) {
	db, err := Parse(strings.NewReader(sampleDBC))
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	msg := db.Messages[582]
	if !msg.Signals[0].Multiplexed {
		t.Error("m0 signal should be marked multiplexed")
	}
	if msg.Signals[1].Multiplexed {
		t.Error("plain signal should not be marked multiplexed")
	}
	if db.MultiplexedCount() != 1 {
		t.Errorf("MultiplexedCount = %d, want 1", db.MultiplexedCount())
	}
}

func TestParseRejectsEmpty(t *testing.T) {
	if _, err := Parse(strings.NewReader("VERSION \"\"\n")); err == nil {
		t.Error("expected an error for a DBC with no messages")
	}
}

// The real file is the one that matters — a parser that only handles the
// synthetic sample above would be useless.
func TestParseEmbeddedCayman(t *testing.T) {
	db, err := Cayman987()
	if err != nil {
		t.Fatalf("Cayman987: %v", err)
	}
	if len(db.Messages) != 30 {
		t.Errorf("message count = %d, want 30", len(db.Messages))
	}
	if db.SignalCount() != 214 {
		t.Errorf("signal count = %d, want 214", db.SignalCount())
	}
	// 0x24A PSM2 — a message we expect to decode on the car.
	if _, ok := db.Messages[0x24A]; !ok {
		t.Error("0x24A missing from the parsed database")
	}
	for id, m := range db.Messages {
		if m.Length < 1 || m.Length > 64 {
			t.Errorf("message 0x%X has implausible length %d", id, m.Length)
		}
		for _, s := range m.Signals {
			if s.StartBit+s.Length > m.Length*8 {
				t.Errorf("0x%X signal %s runs past the frame: %d|%d in %d bytes",
					id, s.Name, s.StartBit, s.Length, m.Length)
			}
		}
	}
}

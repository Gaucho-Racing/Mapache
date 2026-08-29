package service

import (
	"encoding/binary"
	"encoding/json"
	"testing"
	"time"

	"github.com/gaucho-racing/mapache/p987/model"
	"github.com/gaucho-racing/mapache/p987/pkg/logger"
)

func init() {
	// The service logs through the package logger, which main wires up
	// before anything else runs.
	logger.Init(false)
	if err := InitDecoder(); err != nil {
		panic(err)
	}
}

// validTS is a timestamp comfortably past the pre-clock cutoff.
var validTS = int(time.Date(2026, 8, 1, 0, 0, 0, 0, time.UTC).UnixMicro())

func metaStatus(t *testing.T, raw []byte) string {
	t.Helper()
	var m map[string]any
	if err := json.Unmarshal(raw, &m); err != nil {
		t.Fatalf("metadata is not valid json: %v", err)
	}
	status, _ := m["status"].(string)
	return status
}

func TestIsValidProducedAt(t *testing.T) {
	if IsValidProducedAt(0) {
		t.Error("epoch 0 should be rejected — a Pi with no RTC boots to 1970")
	}
	if !IsValidProducedAt(validTS) {
		t.Error("a 2026 timestamp should be accepted")
	}
}

func TestProcessFrameDecodesDBCMessage(t *testing.T) {
	// 0xC2 SCCM1: SCCM_SteeringAngle is 13 bits at bit 2, scale 0.175.
	data := []byte{0xA0, 0x0F, 0, 0, 0, 0, 0, 0}
	can, signals := ProcessFrame("cayman", "pcan", 0xC2, validTS, data)

	if got := metaStatus(t, can.Metadata); got != "ok" {
		t.Fatalf("metadata status = %q, want ok", got)
	}
	if can.NodeID != "pcan" {
		t.Errorf("node id = %q, want the bus label", can.NodeID)
	}
	if len(signals) == 0 {
		t.Fatal("expected decoded signals")
	}

	var found bool
	for _, s := range signals {
		if s.Name == "pcan_SCCM_SteeringAngle" {
			found = true
			if s.Value != 175.0 {
				t.Errorf("steering angle = %v, want 175", s.Value)
			}
			if s.RawValue != 1000 {
				t.Errorf("steering raw = %d, want 1000", s.RawValue)
			}
		}
		if s.VehicleID != "cayman" || s.Timestamp != validTS {
			t.Errorf("signal %s not stamped: vehicle=%q ts=%d", s.Name, s.VehicleID, s.Timestamp)
		}
	}
	if !found {
		t.Error("pcan_SCCM_SteeringAngle missing — signals should be bus-prefixed")
	}
}

func TestProcessFrameKeepsRawFrameOnUnknownID(t *testing.T) {
	can, signals := ProcessFrame("cayman", "pcan", 0x7FF, validTS, []byte{1, 2, 3})
	if len(signals) != 0 {
		t.Errorf("unknown id should decode no signals, got %d", len(signals))
	}
	if got := metaStatus(t, can.Metadata); got != "unknown_can_id" {
		t.Errorf("status = %q, want unknown_can_id", got)
	}
	// The frame itself must still be stored — that's how an unknown id
	// gets reverse-engineered later.
	if len(can.Bytes) != 3 {
		t.Errorf("raw bytes = %v, want them preserved", can.Bytes)
	}
}

func TestProcessFrameRejectsPreClockTimestamp(t *testing.T) {
	can, signals := ProcessFrame("cayman", "pcan", 0xC2, 0, []byte{0xA0, 0x0F, 0, 0, 0, 0, 0, 0})
	if len(signals) != 0 {
		t.Error("a pre-clock frame should decode no signals")
	}
	if got := metaStatus(t, can.Metadata); got != "invalid_timestamp" {
		t.Errorf("status = %q, want invalid_timestamp", got)
	}
}

func TestProcessFrameFlagsShortFrame(t *testing.T) {
	// 0xC2 is declared as 8 bytes.
	can, signals := ProcessFrame("cayman", "pcan", 0xC2, validTS, []byte{0x01, 0x02})
	if len(signals) != 0 {
		t.Error("a short frame should decode no signals")
	}
	if got := metaStatus(t, can.Metadata); got != "short_frame" {
		t.Errorf("status = %q, want short_frame", got)
	}
}

func TestProcessFrameDecodesTCMStatus(t *testing.T) {
	data := make([]byte, 8)
	data[0] = 0b1111
	binary.LittleEndian.PutUint16(data[1:3], 42)

	_, signals := ProcessFrame("cayman", "tcm", model.MsgIDTCMStatus, validTS, data)
	byName := map[string]float64{}
	for _, s := range signals {
		byName[s.Name] = s.Value
	}
	if byName["tcm_mapache_ok"] != 1 {
		t.Errorf("tcm_mapache_ok = %v, want 1", byName["tcm_mapache_ok"])
	}
	if byName["tcm_mapache_ping"] != 42 {
		t.Errorf("tcm_mapache_ping = %v, want 42", byName["tcm_mapache_ping"])
	}
}

// 0x200 and 0x201 are only TCM frames when they arrive on the tcm bus.
// The same ids on a physical bus belong to the DBC (0x210 is SCCM2).
func TestProcessFrameOnlyTreatsTCMBusAsHousekeeping(t *testing.T) {
	data := make([]byte, 29)
	_, signals := ProcessFrame("cayman", "pcan", model.MsgIDTCMResources, validTS, data)
	for _, s := range signals {
		if s.Name == "pcan_cpu_temp" {
			t.Error("0x201 on a physical bus must not decode as TCM resources")
		}
	}
}

func TestProcessFrameDecodesTCMResources(t *testing.T) {
	data := make([]byte, 29)
	binary.LittleEndian.PutUint16(data[13:15], 512)
	data[27] = 55
	data[28] = 0b0010

	_, signals := ProcessFrame("cayman", "tcm", model.MsgIDTCMResources, validTS, data)
	byName := map[string]float64{}
	for _, s := range signals {
		byName[s.Name] = s.Value
	}
	if byName["tcm_ram_total"] != 512 {
		t.Errorf("tcm_ram_total = %v, want 512", byName["tcm_ram_total"])
	}
	if byName["tcm_cpu_temp"] != 55 {
		t.Errorf("tcm_cpu_temp = %v, want 55", byName["tcm_cpu_temp"])
	}
	if byName["tcm_undervoltage_since_boot"] != 1 {
		t.Errorf("tcm_undervoltage_since_boot = %v, want 1", byName["tcm_undervoltage_since_boot"])
	}
}

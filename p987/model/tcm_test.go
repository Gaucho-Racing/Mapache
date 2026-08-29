package model

import (
	"encoding/binary"
	"testing"
)

func find(t *testing.T, decoded []Decoded, name string) Decoded {
	t.Helper()
	for _, d := range decoded {
		if d.Name == name {
			return d
		}
	}
	t.Fatalf("signal %q not decoded", name)
	return Decoded{}
}

func TestDecodeTCMStatus(t *testing.T) {
	data := make([]byte, 8)
	data[0] = 0b1011 // connection, mqtt, clock ok; mapache down
	binary.LittleEndian.PutUint16(data[1:3], 1234)

	got, ok := DecodeTCMStatus(data)
	if !ok {
		t.Fatal("decode failed")
	}
	for name, want := range map[string]float64{
		"connection_ok": 1,
		"mqtt_ok":       1,
		"mapache_ok":    0,
		"clock_ok":      1,
		"mapache_ping":  1234,
	} {
		if v := find(t, got, name).Value; v != want {
			t.Errorf("%s = %v, want %v", name, v, want)
		}
	}
}

func TestDecodeTCMStatusRejectsShortFrame(t *testing.T) {
	if _, ok := DecodeTCMStatus([]byte{0x01, 0x02}); ok {
		t.Error("a 2-byte status frame should not decode")
	}
}

// buildResources mirrors the relay's encodeResourcePayload. If the two
// layouts ever drift this test is what catches it.
func buildResources() []byte {
	data := make([]byte, resourcesPayloadSize)
	off := 0
	for i, v := range []struct{ freq, util int }{{1000, 10}, {1001, 20}, {1002, 30}, {1003, 40}} {
		binary.LittleEndian.PutUint16(data[off:off+2], uint16(v.freq))
		data[off+2] = byte(v.util)
		off += 3
		_ = i
	}
	data[12] = 25
	binary.LittleEndian.PutUint16(data[13:15], 512)
	binary.LittleEndian.PutUint16(data[15:17], 128)
	data[17] = 25
	binary.LittleEndian.PutUint32(data[18:22], 30000)
	binary.LittleEndian.PutUint32(data[22:26], 12000)
	data[26] = 40
	data[27] = 55
	data[28] = ThrottleFlagsForTest
	return data
}

// bit 1 (under-voltage since boot) and bit 2 (thermal throttled now).
const ThrottleFlagsForTest = 0b0110

func TestDecodeTCMResources(t *testing.T) {
	got, ok := DecodeTCMResources(buildResources())
	if !ok {
		t.Fatal("decode failed")
	}

	for name, want := range map[string]float64{
		"cpu_0_freq":                   1000,
		"cpu_0_util":                   10,
		"cpu_3_freq":                   1003,
		"cpu_3_util":                   40,
		"cpu_total_util":               25,
		"ram_total":                    512,
		"ram_used":                     128,
		"ram_util":                     25,
		"disk_total":                   30000,
		"disk_used":                    12000,
		"disk_util":                    40,
		"cpu_temp":                     55,
		"undervoltage":                 0,
		"undervoltage_since_boot":      1,
		"thermal_throttled":            1,
		"thermal_throttled_since_boot": 0,
	} {
		if v := find(t, got, name).Value; v != want {
			t.Errorf("%s = %v, want %v", name, v, want)
		}
	}
}

// The Jetson layout was 44 bytes with GPU and power fields. A relay still
// sending that would decode into garbage, so the length check must reject
// anything shorter than the current layout and the decoder must not read
// past it.
func TestDecodeTCMResourcesRejectsOldLayout(t *testing.T) {
	if _, ok := DecodeTCMResources(make([]byte, 28)); ok {
		t.Error("a 28-byte frame should not decode")
	}
	if _, ok := DecodeTCMResources(make([]byte, resourcesPayloadSize)); !ok {
		t.Error("a 29-byte frame should decode")
	}
}

func TestDecodeTCMResourcesReportsEveryCPU(t *testing.T) {
	got, _ := DecodeTCMResources(buildResources())
	for i := 0; i < ReportedCPUs; i++ {
		find(t, got, cpuNames[i].freq)
		find(t, got, cpuNames[i].util)
	}
	// The Pi has no GPU counters, so these must not appear at all.
	for _, gone := range []string{"gpu_util", "gpu_freq", "gpu_temp", "voltage_draw", "power_draw"} {
		for _, d := range got {
			if d.Name == gone {
				t.Errorf("%s should not be decoded on the Pi layout", gone)
			}
		}
	}
}

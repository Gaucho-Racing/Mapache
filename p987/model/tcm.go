package model

import "encoding/binary"

// The TCM publishes two synthetic frames under the "tcm" bus label. They
// never touched a physical CAN bus, so they are not in the DBC and are
// decoded here instead.
const (
	MsgIDTCMStatus    = 0x200
	MsgIDTCMResources = 0x201
)

// Decoded is the decoder output, matching dbc.Decoded so the dispatch path
// treats DBC frames and TCM frames identically.
type Decoded struct {
	Name  string
	Value float64
	Raw   int64
	Unit  string
}

// TCM Status is 8 bytes published every 5s:
//
//	[0]    status_bits
//	[1:3]  mapache_ping u16 LE, ms
//	[3:8]  reserved
//
// Each status bit becomes its own boolean signal so consumers can ask "is
// X reachable?" without bit-twiddling.
func DecodeTCMStatus(data []byte) ([]Decoded, bool) {
	if len(data) < 3 {
		return nil, false
	}
	bits := data[0]
	out := []Decoded{
		bit(bits, 0, "connection_ok"),
		bit(bits, 1, "mqtt_ok"),
		bit(bits, 2, "mapache_ok"),
		bit(bits, 3, "clock_ok"),
	}
	ping := binary.LittleEndian.Uint16(data[1:3])
	return append(out, Decoded{Name: "mapache_ping", Value: float64(ping), Raw: int64(ping), Unit: "ms"}), true
}

func bit(v byte, n uint, name string) Decoded {
	raw := int64(v >> n & 1)
	return Decoded{Name: name, Value: float64(raw), Raw: raw}
}

// resourcesPayloadSize is the TCM-987 0x201 layout. It is deliberately not
// TCM-26's 44-byte Jetson layout: a Pi Zero 2 W is quad-core with no
// discrete GPU counters and no power-rail sensors, so those fields would
// be permanently zero. The freed space carries throttle flags instead,
// which is the failure mode this board actually has — under-voltage
// corrupts SD cards and shows up in no other metric.
//
//	[0:12]  4 × (freq u16 LE MHz, util u8 %)
//	[12]    cpu_total_util u8 %
//	[13:15] ram_total  u16 LE MB
//	[15:17] ram_used   u16 LE MB
//	[17]    ram_util   u8 %
//	[18:22] disk_total u32 LE MB
//	[22:26] disk_used  u32 LE MB
//	[26]    disk_util  u8 %
//	[27]    cpu_temp   u8 °C
//	[28]    throttle_flags u8
const resourcesPayloadSize = 29

// ReportedCPUs must match the relay's model.ReportedCPUs.
const ReportedCPUs = 4

var cpuNames = [ReportedCPUs]struct{ freq, util string }{
	{"cpu_0_freq", "cpu_0_util"},
	{"cpu_1_freq", "cpu_1_util"},
	{"cpu_2_freq", "cpu_2_util"},
	{"cpu_3_freq", "cpu_3_util"},
}

func DecodeTCMResources(data []byte) ([]Decoded, bool) {
	if len(data) < resourcesPayloadSize {
		return nil, false
	}

	out := make([]Decoded, 0, 20)
	for i := 0; i < ReportedCPUs; i++ {
		off := i * 3
		freq := binary.LittleEndian.Uint16(data[off : off+2])
		out = append(out,
			Decoded{Name: cpuNames[i].freq, Value: float64(freq), Raw: int64(freq), Unit: "MHz"},
			Decoded{Name: cpuNames[i].util, Value: float64(data[off+2]), Raw: int64(data[off+2]), Unit: "%"},
		)
	}

	ramTotal := binary.LittleEndian.Uint16(data[13:15])
	ramUsed := binary.LittleEndian.Uint16(data[15:17])
	diskTotal := binary.LittleEndian.Uint32(data[18:22])
	diskUsed := binary.LittleEndian.Uint32(data[22:26])
	throttle := data[28]

	out = append(out,
		Decoded{Name: "cpu_total_util", Value: float64(data[12]), Raw: int64(data[12]), Unit: "%"},
		Decoded{Name: "ram_total", Value: float64(ramTotal), Raw: int64(ramTotal), Unit: "MB"},
		Decoded{Name: "ram_used", Value: float64(ramUsed), Raw: int64(ramUsed), Unit: "MB"},
		Decoded{Name: "ram_util", Value: float64(data[17]), Raw: int64(data[17]), Unit: "%"},
		Decoded{Name: "disk_total", Value: float64(diskTotal), Raw: int64(diskTotal), Unit: "MB"},
		Decoded{Name: "disk_used", Value: float64(diskUsed), Raw: int64(diskUsed), Unit: "MB"},
		Decoded{Name: "disk_util", Value: float64(data[26]), Raw: int64(data[26]), Unit: "%"},
		Decoded{Name: "cpu_temp", Value: float64(data[27]), Raw: int64(data[27]), Unit: "C"},
		bit(throttle, 0, "undervoltage"),
		bit(throttle, 1, "undervoltage_since_boot"),
		bit(throttle, 2, "thermal_throttled"),
		bit(throttle, 3, "thermal_throttled_since_boot"),
	)
	return out, true
}

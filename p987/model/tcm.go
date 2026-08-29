package model

import (
	"fmt"

	mp "github.com/gaucho-racing/mapache/mapache-go/v3"
)

// The TCM publishes these under the "tcm" bus label. They never touched a
// physical CAN bus, so they are not in the 987 DBC.
const (
	MsgIDTCMStatus    = 0x200
	MsgIDTCMResources = 0x201
)

// TCMStatus is a synthetic 8-byte message the relay publishes every 5s
// summarizing on-vehicle connectivity. status_bits is a flat bitfield;
// each bit is exposed as its own boolean signal so consumers can query
// "is X reachable?" without bit-twiddling.
//
//	connection_ok — TCM has general internet (DNS reachable)
//	mqtt_ok       — cloud MQTT broker is connected
//	mapache_ok    — cloud Mapache is responding (recent pong)
//	clock_ok      — local clock past the 2003-10-31 cutoff (RTC/NTP synced)
//	mapache_ping  — RTT to Mapache in ms, from the most recent pong
var TCMStatus = mp.Message{
	mp.NewField("status_bits", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			flag("connection_ok", f.Value, 0),
			flag("mqtt_ok", f.Value, 1),
			flag("mapache_ok", f.Value, 2),
			flag("clock_ok", f.Value, 3),
		}
	}),
	mp.NewField("mapache_ping", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "mapache_ping", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("_reserved", 5, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return nil
	}),
}

// TCMResourceUtil is the relay's 29-byte resource frame, published every
// 10s. Deliberately not TCM-26's 44-byte Jetson layout: a Pi Zero 2 W is
// quad-core with no discrete GPU counters and no power-rail sensors, so
// those fields would be permanently zero. The freed space carries throttle
// flags instead, which is the failure mode this board actually has —
// under-voltage corrupts SD cards and shows up in no other metric.
var TCMResourceUtil = mp.Message{
	cpuField(0), cpuField(1), cpuField(2), cpuField(3),
	mp.NewField("cpu_total_util", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{Name: "cpu_total_util", Value: float64(f.Value), RawValue: f.Value}}
	}),
	mp.NewField("ram_total", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{Name: "ram_total", Value: float64(f.Value), RawValue: f.Value}}
	}),
	mp.NewField("ram_used", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{Name: "ram_used", Value: float64(f.Value), RawValue: f.Value}}
	}),
	mp.NewField("ram_util", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{Name: "ram_util", Value: float64(f.Value), RawValue: f.Value}}
	}),
	mp.NewField("disk_total", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{Name: "disk_total", Value: float64(f.Value), RawValue: f.Value}}
	}),
	mp.NewField("disk_used", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{Name: "disk_used", Value: float64(f.Value), RawValue: f.Value}}
	}),
	mp.NewField("disk_util", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{Name: "disk_util", Value: float64(f.Value), RawValue: f.Value}}
	}),
	mp.NewField("cpu_temp", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{Name: "cpu_temp", Value: float64(f.Value), RawValue: f.Value}}
	}),
	mp.NewField("throttle_flags", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			flag("undervoltage", f.Value, 0),
			flag("undervoltage_since_boot", f.Value, 1),
			flag("thermal_throttled", f.Value, 2),
			flag("thermal_throttled_since_boot", f.Value, 3),
		}
	}),
}

// cpuField builds the repeated per-core (freq u16, util u8) triple. The Pi
// Zero 2 W's BCM2710A1 is quad-core, so the relay sends exactly four.
func cpuField(n int) mp.Field {
	freq := fmt.Sprintf("cpu_%d_freq", n)
	util := fmt.Sprintf("cpu_%d_util", n)
	return mp.NewField(fmt.Sprintf("cpu_%d", n), 3, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig(freq, f.Value, 0, 16, false, 1, 0),
			sig(util, f.Value, 16, 8, false, 1, 0),
		}
	})
}

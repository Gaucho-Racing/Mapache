package model

import mp "github.com/gaucho-racing/mapache/mapache-go/v3"

// Ping (msg 0x002) is the per-node CAN heartbeat. Each node broadcasts it
// periodically with a 4-byte millis-since-boot timestamp. Decoding it lets
// the dash see liveness per node (e.g., last `ecu_timestamp` update tells
// you when the ECU last broadcast).
var Ping = mp.Message{
	mp.NewField("timestamp", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "timestamp", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
}

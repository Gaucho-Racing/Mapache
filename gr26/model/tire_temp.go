package model

import (
	"fmt"

	mp "github.com/gaucho-racing/mapache/mapache-go/v3"
)

// Tire temperature thermal arrays. The four corners (FL/FR/RL/RR) share these
// base CAN IDs and are distinguished at runtime by node_id. Each corner streams
// a 768-pixel thermal image across 24 CAN-FD frames of 32 pixels each (u16,
// little-endian); pixels are numbered globally 0-767 across the frames.
// TODO(grcan-sync): these are 64-byte CAN-FD frames - confirm the ingest
// pipeline delivers >8-byte payloads before relying on them.
func tireTempFrame(start int) mp.Message {
	msg := mp.Message{}
	for i := 0; i < 32; i++ {
		name := fmt.Sprintf("pixel%d", start+i)
		msg = append(msg, mp.NewField(name, 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
			return []mp.Signal{
				{Name: f.Name, Value: float64(f.Value), RawValue: f.Value},
			}
		}))
	}
	return msg
}

var TireTempFrame0 = tireTempFrame(0)
var TireTempFrame1 = tireTempFrame(32)
var TireTempFrame2 = tireTempFrame(64)
var TireTempFrame3 = tireTempFrame(96)
var TireTempFrame4 = tireTempFrame(128)
var TireTempFrame5 = tireTempFrame(160)
var TireTempFrame6 = tireTempFrame(192)
var TireTempFrame7 = tireTempFrame(224)
var TireTempFrame8 = tireTempFrame(256)
var TireTempFrame9 = tireTempFrame(288)
var TireTempFrame10 = tireTempFrame(320)
var TireTempFrame11 = tireTempFrame(352)
var TireTempFrame12 = tireTempFrame(384)
var TireTempFrame13 = tireTempFrame(416)
var TireTempFrame14 = tireTempFrame(448)
var TireTempFrame15 = tireTempFrame(480)
var TireTempFrame16 = tireTempFrame(512)
var TireTempFrame17 = tireTempFrame(544)
var TireTempFrame18 = tireTempFrame(576)
var TireTempFrame19 = tireTempFrame(608)
var TireTempFrame20 = tireTempFrame(640)
var TireTempFrame21 = tireTempFrame(672)
var TireTempFrame22 = tireTempFrame(704)
var TireTempFrame23 = tireTempFrame(736)

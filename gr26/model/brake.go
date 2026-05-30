package model

import mp "github.com/gaucho-racing/mapache/mapache-go/v3"

// TODO(grcan-sync): DLC is 16 (CAN-FD); confirm decoder handles >8 bytes.
var BrakeTemp = mp.Message{
	mp.NewField("temp", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "temp", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("_reserved", 14, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return nil
	}),
}

// TODO(grcan-sync): DLC is 16 (CAN-FD); confirm decoder handles >8 bytes.
var WheelSpeed = mp.Message{
	mp.NewField("speed", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "speed", Value: float64(f.Value) * 0.125, RawValue: f.Value},
		}
	}),
	mp.NewField("_reserved", 14, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return nil
	}),
}

package model

import mp "github.com/gaucho-racing/mapache/mapache-go/v3"

var FanStatus = mp.Message{
	mp.NewField("fan_speed", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "fan_speed", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("input_voltage", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "input_voltage", Value: float64(f.Value) * 0.1, RawValue: f.Value},
		}
	}),
	mp.NewField("input_current", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "input_current", Value: float64(f.Value) * 0.1, RawValue: f.Value},
		}
	}),
}

var FanCommand = mp.Message{
	mp.NewField("fan_command", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "fan_command", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
}

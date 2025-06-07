package model

import mp "github.com/gaucho-racing/mapache-go"

var FanStatus = mp.Message{
	mp.NewField("speed", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "speed",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("input_voltage", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "input_voltage",
			Value:    float64(f.Value) * 0.1,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("input_current", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "input_current",
			Value:    float64(f.Value) * 0.1,
			RawValue: f.Value,
		})
		return signals
	}),
}

// ECU sends this command so `fan_` is ok in the signal name
var FanCommand = mp.Message{
	mp.NewField("fan_command", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "fan_command",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
}

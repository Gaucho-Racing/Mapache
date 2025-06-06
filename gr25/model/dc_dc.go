package model

import (
	mp "github.com/gaucho-racing/mapache-go"
)

var DC_DCStatus = mp.Message{
	mp.NewField("input_voltage", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "input_voltage",
			Value:    float64(f.Value) / 1000,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("output_voltage", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "output_voltage",
			Value:    float64(f.Value) / 1000,
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
	mp.NewField("output_current", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "output_current",
			Value:    float64(f.Value) * 0.1,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("dc_dc_temp", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "dc_dc_temp",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
}
package model

import (
	mp "github.com/gaucho-racing/mapache-legacy/mapache-go/v3"
)

var SAMIMU = mp.Message{
	mp.NewField("bmi323_acc_x", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "bmi323_acc_x",
			Value:    (float64(f.Value) * 0.01) - 327.68,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("bmi323_acc_y", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "bmi323_acc_y",
			Value:    (float64(f.Value) * 0.01) - 327.68,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("bmi323_acc_z", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "bmi323_acc_z",
			Value:    (float64(f.Value) * 0.01) - 327.68,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("bmi323_gyro_x", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "bmi323_gyro_x",
			Value:    (float64(f.Value) * 0.001) - 32.768,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("bmi323_gyro_y", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "bmi323_gyro_y",
			Value:    (float64(f.Value) * 0.001) - 32.768,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("bmi323_gyro_z", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "bmi323_gyro_z",
			Value:    (float64(f.Value) * 0.001) - 32.768,
			RawValue: f.Value,
		})
		return signals
	}),
}

var SAMSusPots = mp.Message{
	mp.NewField("sus_pot_pos", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "sus_pot_pos",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
}

package model

import mp "github.com/gaucho-racing/mapache-go"

var TCMResourceUtil = mp.Message{
	mp.NewField("CPU_util", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "CPU_util",
			Value:    float64(f.Value), //Percentage is unchanged
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("GPU_util", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "GPU_util",
			Value:    float64(f.Value), //Percentage is unchanged
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("RAM_util", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "RAM_util",
			Value:    float64(f.Value), //Percentage is unchanged
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("disk_util", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "disk_util",
			Value:    float64(f.Value), //Percentage is unchanged
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("power_usage", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "power_usage",
			Value:    float64(f.Value) * 0.1, //deciWatts converted to Watts
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("CPU_temp", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "CPU_temp",
			Value:    float64(f.Value), //Stays as Celsius
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("GPU_temp", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "GPU_temp",
			Value:    float64(f.Value), //Stays as Celsius
			RawValue: f.Value,
		})
		return signals
	}),
}

package model

import mp "github.com/gaucho-racing/mapache-go"

var TCMResourceUtil = mp.Message{
	mp.NewField("cpu_util", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "cpu_util",
			Value:    float64(f.Value), // Percentage is unchanged
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("gpu_util", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "gpu_util",
			Value:    float64(f.Value), // Percentage is unchanged
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("ram_util", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "ram_util",
			Value:    float64(f.Value), // Percentage is unchanged
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("disk_util", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "disk_util",
			Value:    float64(f.Value), // Percentage is unchanged
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("power_util", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "power_util",
			Value:    float64(f.Value) * 0.1, // deciWatts converted to Watts
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("cpu_temp", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "cpu_temp",
			Value:    float64(f.Value), // stays as Celsius
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("gpu_temp", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "gpu_temp",
			Value:    float64(f.Value), // stays as Celsius
			RawValue: f.Value,
		})
		return signals
	}),
}

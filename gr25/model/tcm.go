package model

import mp "github.com/gaucho-racing/mapache-go"

var TCMResourceUtil = mp.Message{
	mp.NewField("cpu0_freq", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "cpu0_freq",
			Value:    float64(f.Value), // MHz
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("cpu0_util", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "cpu0_util",
			Value:    float64(f.Value), // Percentage
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("cpu1_freq", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "cpu1_freq",
			Value:    float64(f.Value), // MHz
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("cpu1_util", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "cpu1_util",
			Value:    float64(f.Value), // Percentage
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("cpu2_freq", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "cpu2_freq",
			Value:    float64(f.Value), // MHz
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("cpu2_util", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "cpu2_util",
			Value:    float64(f.Value), // Percentage
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("cpu3_freq", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "cpu3_freq",
			Value:    float64(f.Value), // MHz
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("cpu3_util", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "cpu3_util",
			Value:    float64(f.Value), // Percentage
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("cpu4_freq", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "cpu4_freq",
			Value:    float64(f.Value), // MHz
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("cpu4_util", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "cpu4_util",
			Value:    float64(f.Value), // Percentage
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("cpu5_freq", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "cpu5_freq",
			Value:    float64(f.Value), // MHz
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("cpu5_util", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "cpu5_util",
			Value:    float64(f.Value), // Percentage
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("cpu_total_util", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "cpu_total_util",
			Value:    float64(f.Value), // Percentage
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("ram_total", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "ram_total",
			Value:    float64(f.Value), // MB
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("ram_used", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "ram_used",
			Value:    float64(f.Value), // MB
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("ram_util", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "ram_util",
			Value:    float64(f.Value), // Percentage
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("gpu_util", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "gpu_util",
			Value:    float64(f.Value), // Percentage
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("gpu_freq", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "gpu_freq",
			Value:    float64(f.Value), // MHz
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("disk_total", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "disk_total",
			Value:    float64(f.Value), // GB
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("disk_used", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "disk_used",
			Value:    float64(f.Value), // GB
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("disk_util", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "disk_util",
			Value:    float64(f.Value), // Percentage
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("cpu_temp", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "cpu_temp",
			Value:    float64(f.Value), // Celsius
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("gpu_temp", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "gpu_temp",
			Value:    float64(f.Value), // Celsius
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("voltage_draw", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "voltage_draw",
			Value:    float64(f.Value) / 1000, // Volts (assuming raw is in millivolts)
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("current_draw", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "current_draw",
			Value:    float64(f.Value) / 1000, // Amps (assuming raw is in milliamps)
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("power_draw", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "power_draw",
			Value:    float64(f.Value) / 1000, // Watts (assuming raw is in milliWatts)
			RawValue: f.Value,
		})
		return signals
	}),
}

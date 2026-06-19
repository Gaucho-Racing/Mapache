package model

import (
	mp "github.com/gaucho-racing/mapache/mapache-go/v3"
)

var DCDCStatus = mp.Message{
	mp.NewField("input_voltage", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "input_voltage", Value: float64(f.Value) * 0.001, RawValue: f.Value},
		}
	}),
	mp.NewField("output_voltage", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "output_voltage", Value: float64(f.Value) * 0.001, RawValue: f.Value},
		}
	}),
	mp.NewField("input_current", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "input_current", Value: float64(f.Value) * 0.1, RawValue: f.Value},
		}
	}),
	mp.NewField("output_current", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "output_current", Value: float64(f.Value) * 0.1, RawValue: f.Value},
		}
	}),
	mp.NewField("dcdc_temp", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "dcdc_temp", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
}

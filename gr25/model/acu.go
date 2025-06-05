package model

import mp "github.com/gaucho-racing/mapache-go"

var ACUStatusOne = mp.Message{
	mp.NewField("accumulator_voltage", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "accumulator_voltage",
			Value:    float64(f.Value) * 0.01,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("ts_voltage", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "ts_voltage",
			Value:    float64(f.Value) * 0.01,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("accumulator_current", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "accumulator_current",
			Value:    float64(f.Value) * 0.01 - 327.68,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("accumulator_soc", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "accumulator_soc",
			Value:    float64(f.Value) * (20.0 / 51.0),
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("glv_soc", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "glv_soc",
			Value:    float64(f.Value) * (20.0 / 51.0),
			RawValue: f.Value,
		})
		return signals
	}),
}

var ACUStatusTwo = mp.Message{
	mp.NewField("20v_voltage", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "20v_voltage",
			Value:    float64(f.Value) * 0.1,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("12v_voltage", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "12v_voltage",
			Value:    float64(f.Value) * 0.1,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("sdc_voltage", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "sdc_voltage",
			Value:    float64(f.Value) * 0.1,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("min_cell_voltage", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "min_cell_voltage",
			Value:    float64(f.Value) * 0.01 + 2,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("max_cell_temp", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "max_cell_temp",
			Value:    float64(f.Value) * 0.25,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("error_warning_1", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		bitMap := []string{
			"over_temp_error",
			"over_voltage_error",
			"under_voltage_error",
			"over_current_error",
			"under_current_error",
			"under_voltage_20v_warning",
			"under_voltage_12v_warning",
			"under_voltage_sdc_warning",
		}
		for i := 0; i < len(bitMap); i++ {
			signals = append(signals, mp.Signal{
				Name:     bitMap[i],
				Value:    float64(f.Bytes[0] >> i & 1),
				RawValue: int(f.Bytes[0] >> i & 1),
			})
		}
		return signals
	}),
	mp.NewField("error_warning_2", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		bitMap := []string{
			"precharge_error",
			"ir_minus_state",
			"ir_plus_state",
			"software_latch",
		}
		for i := 0; i < len(bitMap); i++ {
			signals = append(signals, mp.Signal{
				Name:     bitMap[i],
				Value:    float64(f.Bytes[0] >> i & 1),
				RawValue: int(f.Bytes[0] >> i & 1),
			})
		}
		return signals
	}),
}

var ACUStatusThree = mp.Message{
	mp.NewField("hv_input_voltage", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "hv_input_voltage",
			Value:    float64(f.Value) * 0.01,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("hv_output_voltage", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "hv_output_voltage",
			Value:    float64(f.Value) * 0.01,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("hv_input_current", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "hv_input_current",
			Value:    float64(f.Value) * 0.001,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("hv_output_current", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "hv_output_current",
			Value:    float64(f.Value) * 0.001,
			RawValue: f.Value,
		})
		return signals
	}),
}

var ACUPrecharge = mp.Message{
	mp.NewField("set_ts_active", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		bitMap := []string{
			"set_ts_active",
		}
		signals = append(signals, mp.Signal{
			Name:     bitMap[0],
			Value:    float64(f.CheckBit(0)),
			RawValue: f.CheckBit(0),
		})
		return signals
	}),
}

var ACUConfigChargeParameters = mp.Message{
	mp.NewField("charge_voltage", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "charge_voltage",
			Value:    float64(f.Value) * 0.1,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("charge_current", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "charge_current",
			Value:    float64(f.Value) * 0.1,
			RawValue: f.Value,
		})
		return signals
	}),
}

var ACUConfigOperationalParameters = mp.Message{
	mp.NewField("min_cell_voltage", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "min_cell_voltage",
			Value:    float64(f.Value)*0.01 + 2,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("max_cell_temp", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "max_cell_temp",
			Value:    float64(f.Value) * 0.25,
			RawValue: f.Value,
		})
		return signals
	}),
}

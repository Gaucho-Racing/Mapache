package model

import mp "github.com/gaucho-racing/mapache-go"

var InverterStatusOne = mp.Message{
	mp.NewField("ac_current", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "ac_current",
			Value:    float64(f.Value)*0.01 - 327.68,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("dc_current", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "dc_current",
			Value:    float64(f.Value) * 0.01,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("motor_rpm", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "motor_rpm",
			Value:    float64(f.Value) - 32768,
			RawValue: f.Value,
		})
		return signals
	}),
}

var InverterStatusTwo = mp.Message{
	mp.NewField("u_mosfet_temp", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "u_mosfet_temp",
			Value:    float64(f.Value) - 40,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("v_mosfet_temp", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "v_mosfet_temp",
			Value:    float64(f.Value) - 40,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("w_mosfet_temp", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "w_mosfet_temp",
			Value:    float64(f.Value) - 40,
			RawValue: f.Value,
		})
		return signals
	}),
}

var InverterStatusThree = mp.Message{
	mp.NewField("motor_temp", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "motor_temp",
			Value:    float64(f.Value) - 40,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("fault_flags", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		bitMap := []string{
			"over_voltage_faults",
			"under_voltage_fault",
			"inverter_overtemp_fault",
			"motor_overtemp_fault",
			"transistor_fault",
			"encoder_fault",
			"can_fault",
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

var InverterConfig = mp.Message{
	mp.NewField("max_ac_current", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "max_ac_current",
			Value:    float64(f.Value)*0.01 - 327.68,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("max_dc_current", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "max_dc_current",
			Value:    float64(f.Value)*0.01 - 327.68,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("absolute_max_rpm_limit", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "absolute_max_rpm_limit",
			Value:    float64(f.Value) - 32768,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("motor_direction", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		bitMap := []string{
			"motor_direction",
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

var InverterCommand = mp.Message{
	mp.NewField("set_ac_current", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "set_ac_current",
			Value:    float64(f.Value)*0.01 - 327.68,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("set_dc_current", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "set_dc_current",
			Value:    float64(f.Value)*0.01 - 327.68,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("rpm_limit", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "rpm_limit",
			Value:    float64(f.Value) - 32768,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("field_weakening", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "field_weakening",
			Value:    float64(f.Value) * 0.1,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("drive_enable", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		bitMap := []string{
			"drive_enable",
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

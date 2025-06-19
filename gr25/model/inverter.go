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
			"overtemp_fault",
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

// DTI Inverter

var DTIDataFive = mp.Message{
	mp.NewField("rpm_min_limit", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "rpm_min_limit",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("input_voltage_limit", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "input_voltage_limit",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("can_map_version", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "can_map_version",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("power_limit", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "power_limit",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("rpm_max_limit", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "rpm_max_limit",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("motor_temp_limit", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "motor_temp_limit",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("motor_acc_temp_limit", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "motor_acc_temp_limit",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("igbt_temp_limit", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "igbt_temp_limit",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("igbt_acc_temp_limit", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "igbt_acc_temp_limit",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("drive_enable_limit", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "drive_enable_limit",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("dc_current_limit", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "dc_current_limit",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("capacitor_temp_limit", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "capacitor_temp_limit",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("drive_enable", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "drive_enable",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
	// TODO: is this supposed to be zero bytes?
	mp.NewField("digital_io", 0, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "digital_io",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("brake_signal", 1, mp.Signed, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "brake_signal",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("throttle_signal", 1, mp.Signed, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "throttle_signal",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
}

var DTIDataFour = mp.Message{
	mp.NewField("foc_iq", 4, mp.Signed, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "foc_iq",
			Value:    float64(f.Value) * 0.001,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("foc_id", 4, mp.Signed, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "foc_id",
			Value:    float64(f.Value) * 0.001,
			RawValue: f.Value,
		})
		return signals
	}),
}

var DTIDataThree = mp.Message{
	mp.NewField("fault_codes", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "fault_codes",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("controller_temperature", 2, mp.Signed, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "controller_temperature",
			Value:    float64(f.Value) * 0.1,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("motor_temperature", 2, mp.Signed, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "motor_temperature",
			Value:    float64(f.Value) * 0.1,
			RawValue: f.Value,
		})
		return signals
	}),
}

var DTIDataTwo = mp.Message{
	mp.NewField("dc_current", 2, mp.Signed, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "dc_current",
			Value:    float64(f.Value) * 0.1,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("ac_current", 2, mp.Signed, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "ac_current",
			Value:    float64(f.Value) * 0.1,
			RawValue: f.Value,
		})
		return signals
	}),
}

var DTIDataOne = mp.Message{
	mp.NewField("input_voltage", 2, mp.Signed, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "input_voltage",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
	// TODO: is this supposed to be zero bytes
	mp.NewField("duty_cycle", 0, mp.Signed, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "duty_cycle",
			Value:    float64(f.Value) * 0.1,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("erpm", 4, mp.Signed, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "erpm",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
}

var DTIControlTwelve = mp.Message{
	mp.NewField("drive_enable", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "drive_enable",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
}

var DTIControlEleven = mp.Message{
	mp.NewField("set_max_dc_brake_current", 2, mp.Signed, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "set_max_dc_brake_current",
			Value:    float64(f.Value) * 0.1,
			RawValue: f.Value,
		})
		return signals
	}),
}

var DTIControlTen = mp.Message{
	mp.NewField("set_max_dc_current", 2, mp.Signed, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "set_max_dc_current",
			Value:    float64(f.Value) * 0.1,
			RawValue: f.Value,
		})
		return signals
	}),
}

var DTIControlNine = mp.Message{
	mp.NewField("set_max_brake_current", 2, mp.Signed, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "set_max_brake_current",
			Value:    float64(f.Value) * 0.1,
			RawValue: f.Value,
		})
		return signals
	}),
}

var DTIControlEight = mp.Message{
	mp.NewField("set_max_ac_current", 2, mp.Signed, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "set_max_ac_current",
			Value:    float64(f.Value) * 0.1,
			RawValue: f.Value,
		})
		return signals
	}),
}

var DTIControlSeven = mp.Message{
	mp.NewField("digital_out", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "digital_out",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
}

var DTIControlSix = mp.Message{
	mp.NewField("set_relative_brake_current", 2, mp.Signed, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "set_relative_brake_current",
			Value:    float64(f.Value) * 0.1,
			RawValue: f.Value,
		})
		return signals
	}),
}

var DTIControlFive = mp.Message{
	mp.NewField("set_relative_current", 2, mp.Signed, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "set_relative_current",
			Value:    float64(f.Value) * 0.1,
			RawValue: f.Value,
		})
		return signals
	}),
}

var DTIControlFour = mp.Message{
	mp.NewField("set_position", 2, mp.Signed, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "set_position",
			Value:    float64(f.Value) * 0.1,
			RawValue: f.Value,
		})
		return signals
	}),
}

var DTIControlThree = mp.Message{
	mp.NewField("set_speed", 4, mp.Signed, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "set_speed",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
}

var DTIControlTwo = mp.Message{
	mp.NewField("set_brake_current", 2, mp.Signed, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "set_brake_current",
			Value:    float64(f.Value) * 0.1,
			RawValue: f.Value,
		})
		return signals
	}),
}

var DTIControlOne = mp.Message{
	mp.NewField("set_ac_current", 2, mp.Signed, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "set_ac_current",
			Value:    float64(f.Value) * 0.1,
			RawValue: f.Value,
		})
		return signals
	}),
}

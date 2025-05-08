package model

import (
	"math"

	mp "github.com/gaucho-racing/mapache-go"
)

// ecu
var ECUStatusOne = mp.Message{
	mp.NewField("state", 1, mp.Unsigned, mp.LittleEndian, nil),
	mp.NewField("status_flags", 3, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		bitMap := []string{
			"acu_status",
			"inv_one_status",
			"inv_two_status",
			"inv_three_status",
			"inv_four_status",
			"fan_one_status",
			"fan_two_status",
			"fan_three_status",
			"fan_four_status",
			"fan_five_status",
			"fan_six_status",
			"fan_seven_status",
			"fan_eight_status",
			"dash_status",
			"steering_status",
		}
		for i := 0; i < len(bitMap); i++ {
			signals = append(signals, mp.Signal{
				Name:     bitMap[i],
				Value:    float64(f.CheckBit(i)),
				RawValue: f.CheckBit(i),
			})
		}
		return signals
	}),
	mp.NewField("ecu_maps", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "power_level",
			Value:    float64((f.Value >> 4) & 0x0F),
			RawValue: (f.Value >> 4) & 0x0F,
		})
		signals = append(signals, mp.Signal{
			Name:     "torque_map",
			Value:    float64(f.Value & 0x0F),
			RawValue: f.Value & 0x0F,
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
	mp.NewField("acu_state_of_charge", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "acu_state_of_charge",
			Value:    float64(f.Value) * 20 / 51,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("glv_state_of_charge", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "glv_state_of_charge",
			Value:    float64(f.Value) * 20 / 51,
			RawValue: f.Value,
		})
		return signals
	}),
}

var ECUStatusTwo = mp.Message{
	mp.NewField("tractive_system_voltage", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "tractive_system_voltage",
			Value:    float64(f.Value) * 0.01,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("vehicle_speed", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "vehicle_speed",
			Value:    float64(f.Value) * 0.01,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("fr_wheel_rpm", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "fr_wheel_rpm",
			Value:    float64(f.Value)*0.1 - 3276.8,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("fl_wheel_rpm", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "fl_wheel_rpm",
			Value:    float64(f.Value)*0.1 - 3276.8,
			RawValue: f.Value,
		})
		return signals
	}),
}

var ECUStatusThree = mp.Message{
	mp.NewField("rr_wheel_rpm", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "rr_wheel_rpm",
			Value:    float64(f.Value)*0.1 - 3276.8,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("rl_wheel_rpm", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "rl_wheel_rpm",
			Value:    float64(f.Value)*0.1 - 3276.8,
			RawValue: f.Value,
		})
		return signals
	}),
}

// dash, inverter, fan, steering
// 403
var DC_DCStatus = mp.Message{
	mp.NewField("input_voltage", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "input_voltage",
			Value:    float64(f.Value) / 1024,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("output_voltage", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "output_voltage",
			Value:    float64(f.Value) / 1024,
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
	}), mp.NewField("dc_dc_temp", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "dc_dc_temp",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
}

// 409
var InvStatus1 = mp.Message{
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

// 413
var InvStatus2 = mp.Message{
	mp.NewField("u_mosfet_temp", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "u_mosfet_temp",
			Value:    float64(f.Value) - 40,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("v_mosfet_temp", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "v_mosfet_temp",
			Value:    float64(f.Value) - 40,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("w_mosfet_temp", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "w_mosfet_temp",
			Value:    float64(f.Value) - 40,
			RawValue: f.Value,
		})
		return signals
	}),
}

// 417
var InvStatus3 = mp.Message{
	mp.NewField("motor_temp", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "motor_temp",
			Value:    float64(f.Value) - 40,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("inv_status_faults", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		bitMap := []string{
			"over_voltage_faults",
			"over_voltage_fault",
			"inv_overtemp_fault",
			"motor_overtemp_fault",
			"transistor_fault",
			"encoder_fault",
			"CAN_fault",
			"future_use",
		}
		for i := 0; i < len(bitMap); i++ {
			signals = append(signals, mp.Signal{
				Name:     bitMap[i],
				Value:    float64(f.CheckBit(i)),
				RawValue: f.CheckBit(i),
			})
		}
		return signals
	}),
}

// 427
var InvConfig = mp.Message{
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
	mp.NewField("max_rpm_limit", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "max_rpm_limit",
			Value:    float64(f.Value) - 32768,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("motor_direction", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "motor_direction",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
}

// 432
var InvCommand = mp.Message{
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
		signals = append(signals, mp.Signal{
			Name:     "drive_enable",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
}

// 438
var FanStatus = mp.Message{
	mp.NewField("fan_speed", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "fan_speed",
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

// 442
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

// 444
var DashStatus = mp.Message{
	mp.NewField("dash_status_led", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		bitMap := []string{
			"dash_bms_led",
			"dash_imd_led",
			"dash_bspd_led",
		}
		for i := 0; i < len(bitMap); i++ {
			signals = append(signals, mp.Signal{
				Name:     bitMap[i],
				Value:    float64(f.CheckBit(i)),
				RawValue: f.CheckBit(i),
			})
		}
		return signals
	}),
	mp.NewField("ts_button_data", 1, mp.Signed, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "ts_button_data",
			Value:    math.Abs(float64(f.Value)) / 10,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("rtd_button_data", 1, mp.Signed, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "rtd_button_data",
			Value:    math.Abs(float64(f.Value)) / 10,
			RawValue: f.Value,
		})
		return signals
	}),
}

// 450
var DashConfig = mp.Message{
	mp.NewField("dash_config_led", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		bitMap := []string{
			"bms_led",
			"imd_led",
			"bspd_led",
		}
		for i := 0; i < len(bitMap); i++ {
			signals = append(signals, mp.Signal{
				Name:     bitMap[i],
				Value:    float64(f.CheckBit(i)),
				RawValue: f.CheckBit(i),
			})
		}
		return signals
	}),
	mp.NewField("r_button_led1", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "r_button_led1",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("g_button_led1", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "g_button_led1",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("b_button_led1", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "b_button_led1",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("r_button_led2", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "r_button_led2",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("g_button_led2", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "g_button_led2",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("r_button_led2", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "b_button_led2",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
}

// 460
var SteeringStatus = mp.Message{
	mp.NewField("steering_encoders", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "current_encoder",
			Value:    float64((f.Value >> 4) & 0x0F),
			RawValue: (f.Value >> 4) & 0x0F,
		})
		signals = append(signals, mp.Signal{
			Name:     "torque_map_encoder",
			Value:    float64(f.Value & 0x0F),
			RawValue: f.Value & 0x0F,
		})
		return signals
	}),
	mp.NewField("regen", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "regen",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("steering_buttons", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		bitMap := []string{
			"button1",
			"button2",
			"button3",
			"button4",
		}
		for i := 0; i < len(bitMap); i++ {
			signals = append(signals, mp.Signal{
				Name:     bitMap[i],
				Value:    float64(f.CheckBit(i)),
				RawValue: f.CheckBit(i),
			})
		}
		return signals
	}),
}

// 468
var SteeringConfig = mp.Message{
	mp.NewField("reserved", 1, mp.Unsigned, mp.LittleEndian, nil),
}

package model

import mp "github.com/gaucho-racing/mapache-go"

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

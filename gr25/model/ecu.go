package model

import mp "github.com/gaucho-racing/mapache-go"

var ECUStatusOne = mp.Message{
	mp.NewField("ecu_state", 1, mp.Unsigned, mp.LittleEndian, nil),
	mp.NewField("ecu_status_flags", 3, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		bitMap := []string{
			"ecu_status_acu",
			"ecu_status_inv_one",
			"ecu_status_inv_two",
			"ecu_status_inv_three",
			"ecu_status_inv_four",
			"ecu_status_fan_one",
			"ecu_status_fan_two",
			"ecu_status_fan_three",
			"ecu_status_fan_four",
			"ecu_status_fan_five",
			"ecu_status_fan_six",
			"ecu_status_fan_seven",
			"ecu_status_fan_eight",
			"ecu_status_dash",
			"ecu_status_steering",
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
			Name:     "ecu_power_level",
			Value:    float64((f.Value >> 4) & 0x0F),
			RawValue: (f.Value >> 4) & 0x0F,
		})
		signals = append(signals, mp.Signal{
			Name:     "ecu_torque_map",
			Value:    float64(f.Value & 0x0F),
			RawValue: f.Value & 0x0F,
		})
		return signals
	}),
	mp.NewField("ecu_max_cell_temp", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "ecu_max_cell_temp",
			Value:    float64(f.Value) * 0.25,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("ecu_acu_state_of_charge", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "ecu_acu_state_of_charge",
			Value:    float64(f.Value) * 20 / 51,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("ecu_glv_state_of_charge", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "ecu_glv_state_of_charge",
			Value:    float64(f.Value) * 20 / 51,
			RawValue: f.Value,
		})
		return signals
	}),
}

var ECUStatusTwo = mp.Message{
	mp.NewField("ecu_tractive_system_voltage", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "ecu_tractive_system_voltage",
			Value:    float64(f.Value) * 0.01,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("ecu_vehicle_speed", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "ecu_vehicle_speed",
			Value:    float64(f.Value) * 0.01,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("ecu_fr_wheel_rpm", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "ecu_fr_wheel_rpm",
			Value:    float64(f.Value)*0.1 - 3276.8,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("ecu_fl_wheel_rpm", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "ecu_fl_wheel_rpm",
			Value:    float64(f.Value)*0.1 - 3276.8,
			RawValue: f.Value,
		})
		return signals
	}),
}

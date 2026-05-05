package model

import (
	"fmt"

	mp "github.com/gaucho-racing/mapache/mapache-go/v3"
)

var ECUStatus1 = mp.Message{
	mp.NewField("ecu_state", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "ecu_state", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("ping_group_1", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "ping_group_1", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("ping_group_2", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "ping_group_2", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("ping_group_3", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "ping_group_3", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("power_torque", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "power_level", Value: float64(f.Value & 0x0F), RawValue: f.Value & 0x0F},
			{Name: "torque_map", Value: float64((f.Value >> 4) & 0x0F), RawValue: (f.Value >> 4) & 0x0F},
		}
	}),
	mp.NewField("max_cell_temp", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "max_cell_temp", Value: float64(f.Value) * 0.25, RawValue: f.Value},
		}
	}),
	mp.NewField("accumulator_soc", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "accumulator_soc", Value: float64(f.Value) * 20.0 / 51.0, RawValue: f.Value},
		}
	}),
	mp.NewField("glv_soc", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "glv_soc", Value: float64(f.Value) * 20.0 / 51.0, RawValue: f.Value},
		}
	}),
}

var ECUStatus2 = mp.Message{
	mp.NewField("ts_voltage", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "ts_voltage", Value: float64(f.Value) * 0.01, RawValue: f.Value},
		}
	}),
	mp.NewField("vehicle_speed", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "vehicle_speed", Value: float64(f.Value) * 0.01, RawValue: f.Value},
		}
	}),
	mp.NewField("fl_wheel_rpm", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "fl_wheel_rpm", Value: float64(f.Value)*0.1 - 3276.8, RawValue: f.Value},
		}
	}),
	mp.NewField("fr_wheel_rpm", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "fr_wheel_rpm", Value: float64(f.Value)*0.1 - 3276.8, RawValue: f.Value},
		}
	}),
}

var ECUStatus3 = mp.Message{
	mp.NewField("rl_wheel_rpm", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "rl_wheel_rpm", Value: float64(f.Value)*0.1 - 3276.8, RawValue: f.Value},
		}
	}),
	mp.NewField("rr_wheel_rpm", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "rr_wheel_rpm", Value: float64(f.Value)*0.1 - 3276.8, RawValue: f.Value},
		}
	}),
	mp.NewField("relay_states", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "relay_states", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
}

var ECUAnalogData = mp.Message{
	mp.NewField("bspd_signal", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "bspd_signal", Value: float64(f.Value) / 655.35, RawValue: f.Value},
		}
	}),
	mp.NewField("bse_signal", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "bse_signal", Value: float64(f.Value) / 655.35, RawValue: f.Value},
		}
	}),
	mp.NewField("apps1_signal", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "apps1_signal", Value: float64(f.Value) / 655.35, RawValue: f.Value},
		}
	}),
	mp.NewField("apps2_signal", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "apps2_signal", Value: float64(f.Value) / 655.35, RawValue: f.Value},
		}
	}),
	mp.NewField("brakeline_f_signal", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "brakeline_f_signal", Value: float64(f.Value) / 655.35, RawValue: f.Value},
		}
	}),
	mp.NewField("brakeline_r_signal", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "brakeline_r_signal", Value: float64(f.Value) / 655.35, RawValue: f.Value},
		}
	}),
	mp.NewField("steering_angle_signal", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "steering_angle_signal", Value: float64(f.Value) / 655.35, RawValue: f.Value},
		}
	}),
	mp.NewField("aux_signal", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "aux_signal", Value: float64(f.Value) / 655.35, RawValue: f.Value},
		}
	}),
}

var ECUPingingRTT = func() mp.Message {
	nodes := []string{
		"bcu", "gr_inverter",
		"fan_controller_1", "fan_controller_2", "fan_controller_3",
		"dash_panel", "tcm",
		"tire_temp_fl", "tire_temp_fr", "tire_temp_rl", "tire_temp_rr",
		"suspension_fl", "suspension_fr", "suspension_rl", "suspension_rr",
		"inboard_floor_fl", "inboard_floor_fr", "inboard_floor_rl", "inboard_floor_rr",
		"brake_temp_fl", "brake_temp_fr", "brake_temp_rl", "brake_temp_rr",
		"dgps",
	}
	msg := mp.Message{}
	for _, node := range nodes {
		name := fmt.Sprintf("%s_rtt", node)
		msg = append(msg, mp.NewField(name, 1, mp.Unsigned, mp.LittleEndian, nil))
	}
	return msg
}()

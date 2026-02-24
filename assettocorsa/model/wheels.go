package model

import (
	"math"

	mp "github.com/gaucho-racing/mapache-go"
)

// Message ID 0x00A
// Fields: wheel_speed, tyre_temp, brake_temp, tyre_pressure, slip_ratio, slip_angle, suspension_travel
var WheelFrontLeft = mp.Message{
	mp.NewField("wheel_speed_fl", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "wheel_speed_fl",
			Value:    float64(f.Value),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("tyre_temp_fl", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "tyre_temp_fl",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("brake_temp_fl", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "brake_temp_fl",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("tyre_pressure_fl", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "tyre_pressure_fl",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("slip_ratio_fl", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "slip_ratio_fl",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("slip_angle_fl", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "slip_angle_fl",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("suspension_travel_fl", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "suspension_travel_fl",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
}

// Message ID 0x00B
// Fields: wheel_speed, tyre_temp, brake_temp, tyre_pressure, slip_ratio, slip_angle, suspension_travel
var WheelFrontRight = mp.Message{
	mp.NewField("wheel_speed_fr", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "wheel_speed_fr",
			Value:    float64(f.Value),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("tyre_temp_fr", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "tyre_temp_fr",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("brake_temp_fr", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "brake_temp_fr",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("tyre_pressure_fr", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "tyre_pressure_fr",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("slip_ratio_fr", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "slip_ratio_fr",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("slip_angle_fl", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "slip_angle_fr",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("suspension_travel_fr", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "suspension_travel_fr",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
}

// Message ID 0x00C
// Fields: wheel_speed, tyre_temp, brake_temp, tyre_pressure, slip_ratio, slip_angle, suspension_travel
var WheelRearLeft = mp.Message{
	mp.NewField("wheel_speed_rl", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "wheel_speed_rl",
			Value:    float64(f.Value),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("tyre_temp_rl", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "tyre_temp_rl",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("brake_temp_rl", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "brake_temp_rl",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("tyre_pressure_rl", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "tyre_pressure_rl",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("slip_ratio_rl", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "slip_ratio_rl",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("slip_angle_rl", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "slip_angle_rl",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("suspension_travel_rl", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "suspension_travel_rl",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
}

// Message ID 0x00D
// Fields: wheel_speed, tyre_temp, brake_temp, tyre_pressure, slip_ratio, slip_angle, suspension_travel
var WheelRearRight = mp.Message{
	mp.NewField("wheel_speed_rr", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "wheel_speed_rr",
			Value:    float64(f.Value),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("tyre_temp_rr", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "tyre_temp_rr",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("brake_temp_rr", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "brake_temp_rr",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("tyre_pressure_rr", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "tyre_pressure_rr",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("slip_ratio_rr", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "slip_ratio_rr",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("slip_angle_fl", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "slip_angle_rr",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("suspension_travel_rr", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "suspension_travel_rr",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
}

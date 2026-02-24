package model

import (
	"math"

	mp "github.com/gaucho-racing/mapache-go"
)

// Message ID 0x001
// Fields: speed_kmh, rpm, gear, fuel_level, fuel_per_lap, throttle, brake, steering_angle
var SimDriving = mp.Message{
	mp.NewField("speed_kmh", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "speed_kmh",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("rpm", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "rpm",
			Value:    float64(f.Value),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("gear", 1, mp.Signed, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "gear",
			Value:    float64(int8(f.Value)),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("fuel_level", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "fuel_level",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("fuel_per_lap", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "fuel_per_lap",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("throttle", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "throttle",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("brake", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "brake",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("steering_angle", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "steering_angle",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
}

// Message ID 0x002
// Fields: tyre pressures (fl, fr, rl, rr), tyre temps (fl, fr, rl, rr), brake temps (fl, fr, rl, rr)
var SimTyresBrakes = mp.Message{
	mp.NewField("tyre_pressure_fl", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "tyre_pressure_fl",
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
	mp.NewField("tyre_pressure_rl", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "tyre_pressure_rl",
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
	mp.NewField("tyre_temp_fl", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "tyre_temp_fl",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
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
	mp.NewField("tyre_temp_rl", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "tyre_temp_rl",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
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
	mp.NewField("brake_temp_fl", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "brake_temp_fl",
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
	mp.NewField("brake_temp_rl", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "brake_temp_rl",
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
}

// Message ID 0x003
// Fields: g_force_x, g_force_y, g_force_z
var SimGForce = mp.Message{
	mp.NewField("g_force_x", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "g_force_x",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("g_force_y", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "g_force_y",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("g_force_z", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "g_force_z",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
}

var SimGPS = mp.Message{
	mp.NewField("car_coordinates_x", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "gps_pos_x",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("car_coordinates_y", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "gps_pos_y",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("car_coordinates_z", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "gps_pos_z",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
}

// Message ID 0x010
// Fields: tc_level, abs_level, is_in_pit_lane, fuel_estimated_laps, current_tyre_set, delta_lap_time, exhaust_temp
var SimElectronics = mp.Message{
	mp.NewField("tc_level", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "tc_level",
			Value:    float64(f.Value),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("abs_level", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "abs_level",
			Value:    float64(f.Value),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("is_in_pit_lane", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "is_in_pit_lane",
			Value:    float64(f.Value),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("fuel_estimated_laps", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "fuel_estimated_laps",
			Value:    float64(f.Value),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("current_tyre_set", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "current_tyre_set",
			Value:    float64(f.Value),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("delta_lap_time", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "delta_lap_time",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("exhaust_temp", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "exhaust_temp",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
}

// Message ID 0x012
// Fields: gap_ahead, gap_behind, flag_status, penalty, pit_limiter_on, session_type
var SimRaceStatus = mp.Message{
	mp.NewField("gap_ahead", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "gap_ahead",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("gap_behind", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "gap_behind",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("flag_status", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "flag_status",
			Value:    float64(f.Value),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("penalty", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "penalty",
			Value:    float64(f.Value),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("pit_limiter_on", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "pit_limiter_on",
			Value:    float64(f.Value),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("session_type", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "session_type",
			Value:    float64(f.Value),
			RawValue: f.Value,
		}}
	}),
}

// Message ID 0x055
// Fields: car_damage_front, car_damage_rear, car_damage_left, car_damage_right, car_damage_center
var SimCarDamage = mp.Message{
	mp.NewField("car_damage_front", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "car_damage_front",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("car_damage_rear", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "car_damage_rear",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("car_damage_left", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "car_damage_left",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("car_damage_right", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "car_damage_right",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("car_damage_center", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "car_damage_center",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
}

// Message ID 0x088
// Fields: rain_intensity, track_grip_status, track_status, wind_speed, wind_direction
var SimWeather = mp.Message{
	mp.NewField("rain_intensity", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "rain_intensity",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("track_grip_status", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "track_grip_status",
			Value:    float64(f.Value),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("track_status", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "track_status",
			Value:    float64(f.Value),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("wind_speed", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "wind_speed",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("wind_direction", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "wind_direction",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
}

// Message ID 0x099
// Fields: position, completed_lap, current_lap_time, last_lap_time, best_lap_time,
//
//	estimated_lap_time, current_sector, session_time_left
var SimTiming = mp.Message{
	mp.NewField("position", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "position",
			Value:    float64(f.Value),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("completed_lap", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "completed_lap",
			Value:    float64(f.Value),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("current_lap_time", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "current_lap_time",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("last_lap_time", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "last_lap_time",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("best_lap_time", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "best_lap_time",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("estimated_lap_time", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "estimated_lap_time",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("current_sector", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "current_sector",
			Value:    float64(f.Value),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("session_time_left", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "session_time_left",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
}

package model

import (
	"math"

	mp "github.com/gaucho-racing/mapache-go"
)

// Message ID 0x001
// Fields: speed_kmh, rpm, gear, throttle, brake, steering_angle
var VCM = mp.Message{
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
var LapStatus = mp.Message{
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

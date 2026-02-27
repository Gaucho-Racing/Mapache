package model

import (
	"math"

	mp "github.com/gaucho-racing/mapache-go"
)

// Message ID 0x003
// Fields: gps_latitude, gps_longitude, gps_altitude, gps_status, gps_pos_x, gps_pos_y, gps_pos_z, gps_local_velocity_x, gps_local_velocity_y, gps_local_velocity_z, gps_global_velocity_x, gps_global_velocity_y, gps_global_velocity_z
var dGPS = mp.Message{
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
	mp.NewField("gps_pos_x", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "gps_pos_x",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("gps_pos_y", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "gps_pos_y",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("gps_pos_z", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "gps_pos_z",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("gps_local_velocity_x", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "gps_status",
			Value:    float64(f.Value),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("gps_local_velocity_y", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "gps_local_velocity_y",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("gps_local_velocity_z", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "gps_local_velocity_z",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("gps_global_velocity_x", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "gps_global_velocity_x",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("gps_global_velocity_y", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "gps_global_velocity_y",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
	mp.NewField("gps_global_velocity_z", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{{
			Name:     "gps_global_velocity_z",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		}}
	}),
}

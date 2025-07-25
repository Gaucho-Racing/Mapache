package model

import (
	"math"

	mp "github.com/gaucho-racing/mapache-go"
)

var GPSLatitude = mp.Message{
	mp.NewField("gps_latitude", 8, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "gps_latitude",
			Value:    math.Float64frombits(uint64(f.Value)),
			RawValue: f.Value,
		})
		return signals
	}),
}

var GPSLongitude = mp.Message{
	mp.NewField("gps_longitude", 8, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "gps_longitude",
			Value:    math.Float64frombits(uint64(f.Value)),
			RawValue: f.Value,
		})
		return signals
	}),
}

var GPSAltitude = mp.Message{
	mp.NewField("gps_altitude", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "gps_altitude",
			Value:    float64(math.Float32frombits(uint32(f.Value))),
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("gps_status", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "gps_altitude",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
}

var GPSPx = mp.Message{
	mp.NewField("X_Theta", 2, mp.Signed, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "x_theta",
			Value:    (float64(f.Value) * 0.001),
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("X_Acc", 2, mp.Signed, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "x_acc",
			Value:    (float64(f.Value) * 0.01),
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("Status", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "status",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
}

var GPSQy = mp.Message{
	mp.NewField("Y_Theta", 2, mp.Signed, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "y_theta",
			Value:    float64(f.Value) * 0.001,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("Y_Acc", 2, mp.Signed, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "y_acc",
			Value:    float64(f.Value) * 0.01,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("Status", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "status",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
}

var GPSRz = mp.Message{
	mp.NewField("Z_Theta", 2, mp.Signed, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "z_theta",
			Value:    float64(f.Value) * 0.001,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("Z_Acc", 2, mp.Signed, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "z_acc",
			Value:    float64(f.Value) * 0.01,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("Status", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "status",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
}

var DGPS_UVW = mp.Message{
	mp.NewField("DGPS_u", 2, mp.Signed, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "dgps_u",
			Value:    float64(f.Value) * 0.01,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("DGPS_v", 2, mp.Signed, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "dgps_v",
			Value:    float64(f.Value) * 0.01,
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("DGPS_w", 2, mp.Signed, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "dgps_w",
			Value:    float64(f.Value) * 0.01,
			RawValue: f.Value,
		})
		return signals
	}),
}

package model

import mp "github.com/gaucho-racing/mapache/mapache-go/v3"

// Energy Meter (EM) frames - external Charger-bus device logging current,
// voltage, accumulated energy and pack temperatures.

// TODO(grcan-sync): current: 32-bit raw - if firmware sends IEEE float, decode with math.Float32frombits instead.
// TODO(grcan-sync): voltage: 32-bit raw - if firmware sends IEEE float, decode with math.Float32frombits instead.
var EMMeas = mp.Message{
	mp.NewField("current", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "current", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("voltage", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "voltage", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
}

// TODO(grcan-sync): violation_logging: bit-packed field (2 signals share bytes 0-0); review masks/shifts and pick a field name.
// TODO(grcan-sync): energy: bit-packed field (1 signals share bytes 1-1); review masks/shifts and pick a field name.
var EMStatus = mp.Message{
	mp.NewField("violation_logging", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "violation", Value: float64(f.Value & 0x1), RawValue: f.Value & 0x1},
			{Name: "logging", Value: float64((f.Value >> 1) & 0xF), RawValue: (f.Value >> 1) & 0xF},
		}
	}),
	mp.NewField("energy", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "energy", Value: float64(f.Value & 0xF), RawValue: f.Value & 0xF},
		}
	}),
	mp.NewField("_reserved", 6, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return nil
	}),
}

// TODO(grcan-sync): team_signal_1: 32-bit raw - if firmware sends IEEE float, decode with math.Float32frombits instead.
// TODO(grcan-sync): team_signal_2: 32-bit raw - if firmware sends IEEE float, decode with math.Float32frombits instead.
var EMTeamData1 = mp.Message{
	mp.NewField("team_signal_1", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "team_signal_1", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("team_signal_2", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "team_signal_2", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
}

// TODO(grcan-sync): team_signal_3: 32-bit raw - if firmware sends IEEE float, decode with math.Float32frombits instead.
// TODO(grcan-sync): team_signal_4: 32-bit raw - if firmware sends IEEE float, decode with math.Float32frombits instead.
var EMTeamData2 = mp.Message{
	mp.NewField("team_signal_3", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "team_signal_3", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("team_signal_4", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "team_signal_4", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
}

// TODO(grcan-sync): mux_signal_num_sensors: bit-packed field (2 signals share bytes 0-0); review masks/shifts and pick a field name.
var EMTemp = mp.Message{
	mp.NewField("mux_signal_num_sensors", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "mux_signal", Value: float64(f.Value & 0x1), RawValue: f.Value & 0x1},
			{Name: "num_sensors", Value: float64((f.Value >> 3) & 0xF), RawValue: (f.Value >> 3) & 0xF},
		}
	}),
	mp.NewField("min_temp", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "min_temp", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("max_temp", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "max_temp", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("temp_5n", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "temp_5n", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("temp_5n1", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "temp_5n1", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("temp_5n2", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "temp_5n2", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("temp_5n3", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "temp_5n3", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("temp_5n4", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "temp_5n4", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
}

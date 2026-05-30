package model

import mp "github.com/gaucho-racing/mapache/mapache-go/v3"

// TODO(grcan-sync): DLC is 24 (CAN-FD); confirm decoder handles >8 bytes.
// TODO(grcan-sync): mag_status: signal extends past declared DLC (24 bytes); scaffold clamped it - verify the DBC frame length.
var SuspensionIMUMagData = mp.Message{
	mp.NewField("bmi323_acc_x", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "bmi323_acc_x", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("bmi323_acc_y", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "bmi323_acc_y", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("bmi323_acc_z", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "bmi323_acc_z", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("bmi323_gyro_x", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "bmi323_gyro_x", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("bmi323_gyro_y", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "bmi323_gyro_y", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("bmi323_gyro_z", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "bmi323_gyro_z", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("bmi323_temp", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "bmi323_temp", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("bmi323_status", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "bmi323_status", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("mag_temp", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "mag_temp", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("mag_hysteresis", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "mag_hysteresis", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("mag_angle", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "mag_angle", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("mag_turns", 2, mp.Signed, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "mag_turns", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
}

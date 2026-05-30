package model

import mp "github.com/gaucho-racing/mapache/mapache-go/v3"

// TODO(grcan-sync): DLC is 32 (CAN-FD); confirm decoder handles >8 bytes.
var InboardFloorIMUToFData = mp.Message{
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
	mp.NewField("range_status", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "range_status", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("distance_mm", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "distance_mm", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("ambient_rate_kcps", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "ambient_rate_kcps", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("ambient_per_spad_kcps", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "ambient_per_spad_kcps", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("signal_rate_kcps", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "signal_rate_kcps", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("signal_per_spad_kcps", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "signal_per_spad_kcps", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("number_of_spad", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "number_of_spad", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("sigma_mm", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "sigma_mm", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("_reserved", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return nil
	}),
}

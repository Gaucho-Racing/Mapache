package model

import mp "github.com/gaucho-racing/mapache/mapache-go/v3"

var DTIData1 = mp.Message{
	mp.NewField("erpm", 4, mp.Signed, mp.BigEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "erpm", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("duty_cycle", 2, mp.Signed, mp.BigEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "duty_cycle", Value: float64(f.Value) * 0.1, RawValue: f.Value},
		}
	}),
	mp.NewField("input_voltage", 2, mp.Unsigned, mp.BigEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "input_voltage", Value: float64(f.Value) * 0.1, RawValue: f.Value},
		}
	}),
}

var DTIData2 = mp.Message{
	mp.NewField("ac_current", 2, mp.Signed, mp.BigEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "ac_current", Value: float64(f.Value) * 0.1, RawValue: f.Value},
		}
	}),
	mp.NewField("dc_current", 2, mp.Signed, mp.BigEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "dc_current", Value: float64(f.Value) * 0.1, RawValue: f.Value},
		}
	}),
	mp.NewField("_reserved", 4, mp.Unsigned, mp.BigEndian, func(f mp.Field) []mp.Signal {
		return nil
	}),
}

var DTIData3 = mp.Message{
	mp.NewField("controller_temp", 2, mp.Signed, mp.BigEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "controller_temp", Value: float64(f.Value) * 0.1, RawValue: f.Value},
		}
	}),
	mp.NewField("motor_temp", 2, mp.Signed, mp.BigEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "motor_temp", Value: float64(f.Value) * 0.1, RawValue: f.Value},
		}
	}),
	mp.NewField("fault_codes", 1, mp.Unsigned, mp.BigEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "fault_codes", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("_reserved", 3, mp.Unsigned, mp.BigEndian, func(f mp.Field) []mp.Signal {
		return nil
	}),
}

var DTIData4 = mp.Message{
	mp.NewField("foc_id", 4, mp.Signed, mp.BigEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "foc_id", Value: float64(f.Value) * 0.01, RawValue: f.Value},
		}
	}),
	mp.NewField("foc_iq", 4, mp.Signed, mp.BigEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "foc_iq", Value: float64(f.Value) * 0.01, RawValue: f.Value},
		}
	}),
}

var DTIData5 = mp.Message{
	mp.NewField("throttle", 1, mp.Unsigned, mp.BigEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "throttle", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("brake", 1, mp.Unsigned, mp.BigEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "brake", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("digital_io", 1, mp.Unsigned, mp.BigEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "digital_io", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("drive_enable", 1, mp.Unsigned, mp.BigEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "drive_enable", Value: float64(f.Value & 0x01), RawValue: f.Value & 0x01},
		}
	}),
	mp.NewField("limit_flags", 2, mp.Unsigned, mp.BigEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "limit_flags", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("_reserved", 1, mp.Unsigned, mp.BigEndian, func(f mp.Field) []mp.Signal {
		return nil
	}),
	mp.NewField("can_version", 1, mp.Unsigned, mp.BigEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "can_version", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
}

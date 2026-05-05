package model

import mp "github.com/gaucho-racing/mapache/mapache-go/v3"

var InverterStatus1 = mp.Message{
	mp.NewField("ac_current", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "ac_current", Value: float64(f.Value)*0.01 - 327.68, RawValue: f.Value},
		}
	}),
	mp.NewField("dc_current", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "dc_current", Value: float64(f.Value) * 0.01, RawValue: f.Value},
		}
	}),
	mp.NewField("motor_rpm", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "motor_rpm", Value: float64(f.Value) - 32768, RawValue: f.Value},
		}
	}),
}

var InverterStatus2 = mp.Message{
	mp.NewField("u_mosfet_temp", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "u_mosfet_temp", Value: float64(f.Value&0xFF) - 40, RawValue: f.Value & 0xFF},
		}
	}),
	mp.NewField("v_mosfet_temp", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "v_mosfet_temp", Value: float64(f.Value&0xFF) - 40, RawValue: f.Value & 0xFF},
		}
	}),
	mp.NewField("w_mosfet_temp", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "w_mosfet_temp", Value: float64(f.Value&0xFF) - 40, RawValue: f.Value & 0xFF},
		}
	}),
}

var InverterStatus3 = mp.Message{
	mp.NewField("motor_temp", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "motor_temp", Value: float64(f.Value) - 40, RawValue: f.Value},
		}
	}),
	mp.NewField("_padding", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return nil
	}),
	mp.NewField("fault_bits", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "fault_bits", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
}

var InverterConfig = mp.Message{
	mp.NewField("max_ac_current", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "max_ac_current", Value: float64(f.Value)*0.01 - 327.68, RawValue: f.Value},
		}
	}),
	mp.NewField("max_dc_current", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "max_dc_current", Value: float64(f.Value)*0.01 - 327.68, RawValue: f.Value},
		}
	}),
	mp.NewField("absolute_max_rpm", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "absolute_max_rpm", Value: float64(f.Value) - 32768, RawValue: f.Value},
		}
	}),
	mp.NewField("motor_direction", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "motor_direction", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
}

var InverterCommand = mp.Message{
	mp.NewField("set_ac_current", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "set_ac_current", Value: float64(f.Value)*0.01 - 327.68, RawValue: f.Value},
		}
	}),
	mp.NewField("set_dc_current", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "set_dc_current", Value: float64(f.Value)*0.01 - 327.68, RawValue: f.Value},
		}
	}),
	mp.NewField("rpm_limit", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "rpm_limit", Value: float64(f.Value) - 32768, RawValue: f.Value},
		}
	}),
	mp.NewField("field_weakening", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "field_weakening", Value: float64(f.Value) * 0.1, RawValue: f.Value},
		}
	}),
	mp.NewField("drive_enable", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "drive_enable", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
}

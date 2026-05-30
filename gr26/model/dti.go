package model

import mp "github.com/gaucho-racing/mapache/mapache-go/v3"

// TODO(grcan-sync): the firmware DBC describes all DTI_Data frames as
// LittleEndian with most fields unsigned and scale 1, whereas these models use
// BigEndian + signed + scaling. The DTI is a third-party inverter, so the
// hand-tuned values here are probably the correct ones and the DBC may be a
// placeholder - do NOT conform to the DBC without confirming against the DTI
// datasheet / a live frame capture. (Affects DTIData1-5.)
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

// TODO(grcan-sync): beyond the endianness note above, the DBC defines a richer
// DTI_Data_5 layout than this model: digital_io as 8 discrete digital_input/
// output bits, limit_flags as 8 named limit bits (1 byte, not 2), three
// rpm/power limit values where this model has reserved bytes, and a trailing
// can_version byte. Reconcile against the DTI datasheet before expanding.
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

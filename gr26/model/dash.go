package model

import mp "github.com/gaucho-racing/mapache/mapache-go/v3"

// bit extracts bit n (0 = LSB) of v as a 0/1 signal with the given name.
func bit(v int, n uint, name string) mp.Signal {
	b := (v >> n) & 1
	return mp.Signal{Name: name, Value: float64(b), RawValue: b}
}

// Dash Status is officially 1 byte in the GRCAN spec but the dash panel
// firmware sends 2 bytes (button_flags + led_bits). Each byte has its own
// bitfield layout per the firmware DashStatus struct; we expose every bit
// as its own boolean signal so queries are flat.
var DashStatus = mp.Message{
	mp.NewField("button_flags", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			bit(f.Value, 0, "ts_active"),
			bit(f.Value, 1, "rtd"),
			bit(f.Value, 2, "ts_off"),
			bit(f.Value, 3, "rtd_off"),
		}
	}),
	mp.NewField("led_bits", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			bit(f.Value, 0, "led_bms"),
			bit(f.Value, 1, "led_imd"),
		}
	}),
}

// Dash Config is the ECU → Dash command for which lights to drive and which
// latch states are active. Same flat-bits treatment.
var DashConfig = mp.Message{
	mp.NewField("led_flags", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			bit(f.Value, 0, "led_bms"),
			bit(f.Value, 1, "led_imd"),
			bit(f.Value, 2, "led_bspd"),
			bit(f.Value, 3, "led_bms_latch"),
			bit(f.Value, 4, "led_imd_latch"),
			bit(f.Value, 5, "led_bspd_latch"),
		}
	}),
}

package model

import mp "github.com/gaucho-racing/mapache/mapache-go/v3"

// Dash Status is officially 1 byte in the GRCAN spec (button_led_flags), but
// the dash panel firmware actually sends 2 bytes — button_flags + led_bits as
// separate fields. Decode both until the firmware is updated to match spec.
var DashStatus = mp.Message{
	mp.NewField("button_flags", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "button_flags", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("led_bits", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "led_bits", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
}

var DashConfig = mp.Message{
	mp.NewField("led_latch_flags", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "led_latch_flags", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
}

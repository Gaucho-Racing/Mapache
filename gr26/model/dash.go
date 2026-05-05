package model

import mp "github.com/gaucho-racing/mapache/mapache-go/v3"

var DashStatus = mp.Message{
	mp.NewField("button_led_flags", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "button_led_flags", Value: float64(f.Value), RawValue: f.Value},
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

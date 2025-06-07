package model

import mp "github.com/gaucho-racing/mapache-go"

var DashPanel = mp.Message{
	mp.NewField("dash_panel", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		bitMap := []string{
			"bms_led",
			"imd_led",
			"bspd_led",
		}
		for i := 0; i < len(bitMap); i++ {
			signals = append(signals, mp.Signal{
				Name:     bitMap[i],
				Value:    float64(f.Bytes[0] >> i & 1),
				RawValue: int(f.Bytes[0] >> i & 1),
			})
		}
		return signals
	}),
	mp.NewField("ignored", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{}
	}),
}

// ECU sends this command to dash panel
var DashConfig = mp.Message{
	mp.NewField("dash_panel_leds", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		bitMap := []string{
			"bms_led",
			"imd_led",
			"bspd_led",
		}
		for i := 0; i < len(bitMap); i++ {
			signals = append(signals, mp.Signal{
				Name:     bitMap[i],
				Value:    float64(f.Bytes[0] >> i & 1),
				RawValue: int(f.Bytes[0] >> i & 1),
			})
		}
		return signals
	}),
	mp.NewField("button_led_1_r", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "button_led_1_r",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("button_led_1_g", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "button_led_1_g",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("button_led_1_b", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "button_led_1_b",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("button_led_2_r", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "button_led_2_r",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("button_led_2_g", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "button_led_2_g",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("button_led_2_b", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "button_led_2_b",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
}

// ECU sends this command to dash panel
var DashWarningFlags = mp.Message{
	mp.NewField("warning_flags", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		bitMap := []string{
			"bse_apps_violation",
		}
		for i := 0; i < len(bitMap); i++ {
			signals = append(signals, mp.Signal{
				Name:     bitMap[i],
				Value:    float64(f.Bytes[0] >> i & 1),
				RawValue: int(f.Bytes[0] >> i & 1),
			})
		}
		return signals
	}),
}

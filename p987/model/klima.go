package model

import mp "github.com/gaucho-racing/mapache/mapache-go/v3"

// KLIMA is 0x600 from KLIMO.
var KLIMA = mp.Message{
	mp.NewField("bytes_0_0", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			flag("HVAC_Fan_Increase", f.Value, 0),
			flag("HVAC_Display_On", f.Value, 2),
			flag("KLIMA_CompressorReq", f.Value, 3),
		}
	}),
	mp.NewField("bytes_1_1", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("KLIMA_B1_Bits", f.Value, 0, 4, false, 1, 0),
			flag("KLIMA_RearDefrost", f.Value, 4),
			sig("KLIMA_BlowerStage", f.Value, 5, 3, false, 1, 0),
		}
	}),
	mp.NewField("klima_refrigpressure", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("KLIMA_RefrigPressure", f.Value, 0, 8, false, 0.2, 0), // Bar
		}
	}),
	mp.NewField("klima_b3_temp", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("KLIMA_B3_Temp", f.Value, 0, 8, false, 0.5, -50), // °C
		}
	}),
	mp.NewField("klima_blowerspeed", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("KLIMA_BlowerSpeed", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("klima_insidetemp", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("KLIMA_InsideTemp", f.Value, 0, 8, false, 0.5, -50), // °C
		}
	}),
	mp.NewField("klima_b6_temp", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("KLIMA_B6_Temp", f.Value, 0, 8, false, 0.5, -50), // °C
		}
	}),
	mp.NewField("klima_b7", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("KLIMA_B7", f.Value, 0, 8, false, 1, 0),
		}
	}),
}

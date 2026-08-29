package model

import mp "github.com/gaucho-racing/mapache/mapache-go/v3"

// PDK1 is 0x44C from PDK.
var PDK1 = mp.Message{
	mp.NewField("pdk_selectedgear", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("PDK_SelectedGear", f.Value, 0, 3, false, 1, 0),
		}
	}),
	mp.NewField("pdk_shiftfork1", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("PDK_ShiftFork1", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("pdk_shiftfork2", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("PDK_ShiftFork2", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("pdk_clutchstatus", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("PDK_ClutchStatus", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("pdk_oiltemp", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("PDK_OilTemp", f.Value, 0, 8, false, 0.75, -48), // °C
		}
	}),
	mp.NewField("_reserved", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return nil
	}),
	mp.NewField("pdk_counter", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("PDK_Counter", f.Value, 0, 4, false, 1, 0),
		}
	}),
	mp.NewField("pdk_checksum", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("PDK_Checksum", f.Value, 0, 8, false, 1, 0),
		}
	}),
}

// PDK_Flags is 0x44F from PDK.
// PDK fault flags. All zero in this capture — gearbox healthy.
var PDK_Flags = mp.Message{
	mp.NewField("pdk_errorflags", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("PDK_ErrorFlags", f.Value, 0, 16, false, 1, 0),
		}
	}),
}

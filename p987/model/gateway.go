package model

import mp "github.com/gaucho-racing/mapache/mapache-go/v3"

// Gateway_Cfg is 0x70B from Gateway.
// Gateway module configuration. Constant during capture.
var Gateway_Cfg = mp.Message{
	mp.NewField("gw_config_data", 8, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal { // GW_Config_Data: opaque 64-bit blob, kept in the raw frame
		return nil
	}),
}

// Gateway_Net is 0x70D from Gateway.
// Gateway network configuration. Transitions 0x00→active during startup.
var Gateway_Net = mp.Message{
	mp.NewField("gw_network_data", 8, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal { // GW_Network_Data: opaque 64-bit blob, kept in the raw frame
		return nil
	}),
}

// Gateway_State is 0x719 from Gateway.
// Gateway wake/sleep state. D4 changes 0x0B→0x5B at startup transition.
var Gateway_State = mp.Message{
	mp.NewField("gw_state_b0", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("GW_State_B0", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("gw_state_b1", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("GW_State_B1", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("gw_state_b2", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("GW_State_B2", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("gw_state_change", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("GW_State_Change", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("gw_state_b4_b7", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("GW_State_B4_B7", f.Value, 0, 32, false, 1, 0),
		}
	}),
}

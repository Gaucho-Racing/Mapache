package model

import mp "github.com/gaucho-racing/mapache/mapache-go/v3"

// PSM1 is 0x14A from PSM.
var PSM1 = mp.Message{
	mp.NewField("bytes_0_0", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			flag("ASR_Requirement", f.Value, 0),
			flag("MSR_Requirement", f.Value, 1),
			flag("ABS_Status", f.Value, 2),
			flag("Brake_Intervention", f.Value, 3),
			flag("ESP_Intervention", f.Value, 4),
			sig("ASR_Switching", f.Value, 5, 2, false, 1, 0),
			flag("ESP_Control", f.Value, 7),
		}
	}),
	mp.NewField("bytes_1_1", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			flag("ABS_Error", f.Value, 0),
			flag("ESP_Error", f.Value, 1),
			flag("EBV_Error", f.Value, 2),
			flag("PSM_FootBrake", f.Value, 3),
			flag("PSM_FootBrake2", f.Value, 4),
			flag("PSM_Disabled", f.Value, 5),
			flag("Brake_Fluid_Switch", f.Value, 6),
			flag("PSM_HandBrake", f.Value, 7),
		}
	}),
	mp.NewField("bytes_2_3", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			flag("ESP_Diag_Mode", f.Value, 0),
			sig("Vref", f.Value, 0, 16, false, 0.01, 0), // km/h
		}
	}),
	mp.NewField("psm_torquereqslow", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("PSM_TorqueReqSlow", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("psm_torquereqfast", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("PSM_TorqueReqFast", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("engagement_torque", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("Engagement_Torque", f.Value, 0, 8, false, 0.39, 0), // %
		}
	}),
	mp.NewField("psm_lateralaccel", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("PSM_LateralAccel", f.Value, 0, 8, false, 1, 0),
		}
	}),
}

// PSM2 is 0x24A from PSM.
var PSM2 = mp.Message{
	mp.NewField("psm_wheelspeedfl", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("PSM_WheelSpeedFL", f.Value, 0, 16, false, 0.01, 0), // km/h
		}
	}),
	mp.NewField("psm_wheelspeedfr", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("PSM_WheelSpeedFR", f.Value, 0, 16, false, 0.01, 0), // km/h
		}
	}),
	mp.NewField("psm_wheelspeedrl", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("PSM_WheelSpeedRL", f.Value, 0, 16, false, 0.01, 0), // km/h
		}
	}),
	mp.NewField("psm_wheelspeedrr", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("PSM_WheelSpeedRR", f.Value, 0, 16, false, 0.01, 0), // km/h
		}
	}),
}

// PSM3 is 0x44A from PSM.
var PSM3 = mp.Message{
	mp.NewField("psm3_b0", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("PSM3_B0", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("psm3_b1", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("PSM3_B1", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("psm3_b2", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("PSM3_B2", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("psm3_b3", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("PSM3_B3", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("psm3_b4", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("PSM3_B4", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("psm3_b5", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("PSM3_B5", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("psm3_b6", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("PSM3_B6", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("psm3_b7", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("PSM3_B7", f.Value, 0, 8, false, 1, 0),
		}
	}),
}

// PSM4 is 0x44B from PSM.
var PSM4 = mp.Message{
	mp.NewField("psm_brakepressure", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("PSM_BrakePressure", f.Value, 0, 8, false, 1, 0), // Bar
		}
	}),
	mp.NewField("_reserved", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return nil
	}),
	mp.NewField("bytes_2_3", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("Yaw_Rate", f.Value, 0, 9, false, 0.0021326, 0), // rad/s
			flag("Yaw_Rate_Sign", f.Value, 9),
		}
	}),
	mp.NewField("_reserved", 3, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return nil
	}),
	mp.NewField("longitudinal_accel", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("Longitudinal_Accel", f.Value, 0, 8, false, 0.015, -1.8), // g
		}
	}),
}

// PSM5 is 0x718 from PSM.
var PSM5 = mp.Message{
	mp.NewField("psm5_b0", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("PSM5_B0", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("psm5_b1", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("PSM5_B1", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("psm5_b2", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("PSM5_B2", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("psm5_b3", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("PSM5_B3", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("psm5_b4", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("PSM5_B4", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("psm5_b5", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("PSM5_B5", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("psm5_b6", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("PSM5_B6", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("psm5_b7", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("PSM5_B7", f.Value, 0, 8, false, 1, 0),
		}
	}),
}

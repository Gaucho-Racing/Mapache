package model

import mp "github.com/gaucho-racing/mapache/mapache-go/v3"

// Heartbeat is 0x140 from DME.
var Heartbeat = mp.Message{
	mp.NewField("hb_page", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("HB_Page", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("hb_sourceid", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("HB_SourceID", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("hb_counter", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("HB_Counter", f.Value, 0, 4, false, 1, 0),
		}
	}),
	mp.NewField("hb_checksum", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("HB_Checksum", f.Value, 0, 8, false, 1, 0),
		}
	}),
}

// DME1 is 0x242 from DME.
var DME1 = mp.Message{
	mp.NewField("dme1_counter", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME1_Counter", f.Value, 0, 4, false, 1, 0),
		}
	}),
	mp.NewField("dme_enginetorque", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_EngineTorque", f.Value, 0, 8, false, 0.39, 0), // %
		}
	}),
	mp.NewField("dme_rpm", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_RPM", f.Value, 0, 16, false, 0.25, 0), // rpm
		}
	}),
	mp.NewField("dme_interventions", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_Interventions", f.Value, 0, 8, false, 0.39, 0), // %
		}
	}),
	mp.NewField("dme_app", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_APP", f.Value, 0, 8, false, 0.39215, 0), // %
		}
	}),
	mp.NewField("dme_torqueloss", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_TorqueLoss", f.Value, 0, 8, false, 0.39, 0), // %
		}
	}),
	mp.NewField("dme_drivertrq", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_DriverTrq", f.Value, 0, 8, false, 0.781, 0), // %
		}
	}),
}

// DME2 is 0x245 from DME.
//
// The DBC declares multiplexed signals here without ever declaring the
// multiplexer switch, so there is no way to tell which variant a frame
// carries. Not decoded: DME2_B2_B3, DME2_MUL_Code.
var DME2 = mp.Message{
	mp.NewField("dme2_mux", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME2_MUX", f.Value, 6, 2, false, 1, 0),
		}
	}),
	mp.NewField("dme_coolanttemp", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_CoolantTemp", f.Value, 0, 8, false, 0.75, -48), // °C
		}
	}),
	mp.NewField("_reserved", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return nil
	}),
	mp.NewField("dme_idlespeedtarget", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_IdleSpeedTarget", f.Value, 0, 8, false, 10, 0), // rpm
		}
	}),
	mp.NewField("dme_momentbase", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_MomentBase", f.Value, 0, 8, false, 0.39, 0), // %
		}
	}),
	mp.NewField("dme2_counter", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME2_Counter", f.Value, 0, 4, false, 1, 0),
		}
	}),
	mp.NewField("dme2_torqueindexed", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME2_TorqueIndexed", f.Value, 0, 8, false, 0.39215, 0), // %
		}
	}),
}

// DME3 is 0x246 from DME.
//
// The DBC declares multiplexed signals here without ever declaring the
// multiplexer switch, so there is no way to tell which variant a frame
// carries. Not decoded: DME3_Muxed.
var DME3 = mp.Message{
	mp.NewField("bytes_0_0", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_EngagedGear", f.Value, 0, 3, false, 1, 0),
			flag("DME_KickdownActive", f.Value, 3),
			flag("DME_CompressorRunning", f.Value, 4),
			flag("DME_CompressorFault", f.Value, 5),
			flag("Sport_Mode_Error", f.Value, 6),
			flag("Ambient_Pressure_Error", f.Value, 7),
		}
	}),
	mp.NewField("bytes_1_1", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_GearRequirement", f.Value, 0, 3, false, 1, 0),
			sig("DME_GearRequest", f.Value, 3, 3, false, 1, 0),
			flag("DME_TRQ_Target_Error", f.Value, 6),
			flag("DME_Overboost", f.Value, 7),
		}
	}),
	mp.NewField("dme_gb_targettrq", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_GB_TargetTrq", f.Value, 0, 8, false, 0.39, 0), // %
		}
	}),
	mp.NewField("dme_accelpedalangle", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_AccelPedalAngle", f.Value, 0, 8, false, 0.4, 0), // %
		}
	}),
	mp.NewField("dme_gb_trqactual", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_GB_TrqActual", f.Value, 0, 8, false, 0.39, 0), // %
		}
	}),
	mp.NewField("dme_ambientpressure", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_AmbientPressure", f.Value, 0, 8, false, 5, 0), // mbar
		}
	}),
	mp.NewField("dme3_counter", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME3_Counter", f.Value, 0, 4, false, 1, 0),
		}
	}),
	mp.NewField("_reserved", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return nil
	}),
}

// DME_Lambda is 0x303 from DME.
// Lambda / AFR / intake data. 7-byte DLC unique to 987. Signal layout is approximate — verify with wideband O2.
var DME_Lambda = mp.Message{
	mp.NewField("dme_lambda_counter", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_Lambda_Counter", f.Value, 0, 4, false, 1, 0),
		}
	}),
	mp.NewField("_reserved", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return nil
	}),
	mp.NewField("dme_lambda_value", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_Lambda_Value", f.Value, 0, 16, false, 0.0001, 0),
		}
	}),
	mp.NewField("dme_lambda_status", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_Lambda_Status", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("dme_lambda_checksum", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_Lambda_Checksum", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("dme_lambda_flags", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_Lambda_Flags", f.Value, 0, 8, false, 1, 0),
		}
	}),
}

// DRIVEMODE is 0x308 from DME.
var DRIVEMODE = mp.Message{
	mp.NewField("bytes_0_1", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("LT_Rad_Fan_PWM", f.Value, 0, 2, false, 1, 0),
			sig("RT_Rad_Fan_PWM", f.Value, 2, 2, false, 1, 0),
			flag("Trunk_Lid_Open", f.Value, 4),
			flag("Sport_Mode", f.Value, 5),
			flag("Wiper_Status", f.Value, 6),
			sig("Radio_Key", f.Value, 7, 4, false, 1, 0),
			flag("Low_Beam", f.Value, 11),
			flag("Reverse_Light", f.Value, 12),
			flag("High_Beam", f.Value, 14),
		}
	}),
	mp.NewField("_reserved", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return nil
	}),
	mp.NewField("outside_temp", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("Outside_Temp", f.Value, 0, 8, false, 0.5, -50), // °C
		}
	}),
	mp.NewField("_reserved", 3, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return nil
	}),
}

// DME_Status is 0x31F from DME.
// Engine running status broadcast. Constant data during idle — likely ECU health + counters.
var DME_Status = mp.Message{
	mp.NewField("dme_status_id", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_Status_ID", f.Value, 0, 16, false, 1, 0),
		}
	}),
	mp.NewField("dme_status_flags1", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_Status_Flags1", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("dme_status_flags2", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_Status_Flags2", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("dme_status_reserved", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_Status_Reserved", f.Value, 0, 16, false, 1, 0),
		}
	}),
	mp.NewField("dme_status_counter", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_Status_Counter", f.Value, 0, 16, false, 1, 0),
		}
	}),
}

// DME4 is 0x441 from DME.
var DME4 = mp.Message{
	mp.NewField("bytes_0_0", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			flag("DME_CEL_Flashing", f.Value, 0),
			flag("DME_CEL_Steady", f.Value, 1),
			flag("DME_FuelReserve", f.Value, 2),
			flag("DME_ReducedPower", f.Value, 3),
			flag("DME_EngCompFanAlert", f.Value, 4),
			flag("DME_OilTempSensFault", f.Value, 5),
			flag("DME_OilPressureAlert", f.Value, 6),
			flag("DME_ChargingAlert", f.Value, 7),
		}
	}),
	mp.NewField("bytes_1_1", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_RadFanSpeedReq", f.Value, 0, 7, false, 1, 0), // %
			flag("DME_EngineRunning", f.Value, 7),
		}
	}),
	mp.NewField("dme_fuelconsumption1", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_FuelConsumption1", f.Value, 0, 8, false, 1, 0), // µl
		}
	}),
	mp.NewField("dme_fuelconsumption2", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_FuelConsumption2", f.Value, 0, 8, false, 1, 0), // µl
		}
	}),
	mp.NewField("dme_boostpressure", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_BoostPressure", f.Value, 0, 8, false, 0.01, 0), // bar
		}
	}),
	mp.NewField("dme_oiltemp", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_OilTemp", f.Value, 0, 8, false, 0.75, -48), // °C
		}
	}),
	mp.NewField("dme_oilpressure", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_OilPressure", f.Value, 0, 8, false, 0.04, 0), // bar
		}
	}),
	mp.NewField("bytes_7_7", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			flag("DME_CoolantLevelSW", f.Value, 0),
			sig("DME_EngineCompTemp", f.Value, 1, 6, true, 1, -48), // °C
			flag("DME_EngCompTempFail", f.Value, 7),
		}
	}),
}

// DME_Torque is 0x470 from DME.
var DME_Torque = mp.Message{
	mp.NewField("dme_torque_counter", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_Torque_Counter", f.Value, 0, 4, false, 1, 0),
		}
	}),
	mp.NewField("dme_torque_req1", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_Torque_Req1", f.Value, 0, 8, false, 0.39, 0), // %
		}
	}),
	mp.NewField("dme_torque_req2", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_Torque_Req2", f.Value, 0, 8, false, 0.39, 0), // %
		}
	}),
	mp.NewField("dme_torque_req3", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_Torque_Req3", f.Value, 0, 8, false, 0.39, 0), // %
		}
	}),
	mp.NewField("dme_torque_max", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_Torque_Max", f.Value, 0, 8, false, 0.39, 0), // %
		}
	}),
	mp.NewField("dme_torque_min", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_Torque_Min", f.Value, 0, 8, false, 0.39, 0), // %
		}
	}),
	mp.NewField("_reserved", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return nil
	}),
	mp.NewField("dme_torque_checksum", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_Torque_Checksum", f.Value, 0, 8, false, 1, 0),
		}
	}),
}

// CLUSTER1 is 0x502 from DME.
var CLUSTER1 = mp.Message{
	mp.NewField("cluster1_b0", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("CLUSTER1_B0", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("cluster1_b1", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("CLUSTER1_B1", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("bytes_2_2", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("CLUSTER1_Flags", f.Value, 0, 5, false, 1, 0),
			flag("CLUSTER_ClutchSW", f.Value, 5),
			sig("CLUSTER1_B2u", f.Value, 6, 2, false, 1, 0),
		}
	}),
	mp.NewField("cluster_ambbrightness", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("CLUSTER_AmbBrightness", f.Value, 0, 8, false, 0.3922, 0), // %
		}
	}),
	mp.NewField("cluster1_b4", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("CLUSTER1_B4", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("cluster1_b5", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("CLUSTER1_B5", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("cluster1_b6", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("CLUSTER1_B6", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("cluster1_b7", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("CLUSTER1_B7", f.Value, 0, 8, false, 1, 0),
		}
	}),
}

// Immobilizer is 0x513 from DME.
var Immobilizer = mp.Message{
	mp.NewField("immo_challenge", 5, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("Immo_Challenge", f.Value, 0, 40, false, 1, 0),
		}
	}),
}

// ECU_ID1 is 0x62A from DME.
// ECU identification. Constant: 41 41 08 42 55 67 10 93. Appears at startup only.
var ECU_ID1 = mp.Message{
	mp.NewField("ecu_id1_bytes", 8, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal { // ECU_ID1_Bytes: opaque 64-bit blob, kept in the raw frame
		return nil
	}),
}

// ECU_Coding is 0x62F from DME.
// ECU calibration/coding data. Constant: 59 8F 9E 02 23 00 80 C7.
var ECU_Coding = mp.Message{
	mp.NewField("ecu_coding_bytes", 8, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal { // ECU_Coding_Bytes: opaque 64-bit blob, kept in the raw frame
		return nil
	}),
}

// DME6 is 0x669 from DME.
var DME6 = mp.Message{
	mp.NewField("dme_odometer", 3, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_Odometer", f.Value, 0, 20, false, 1, 0), // km
		}
	}),
	mp.NewField("dme_countrycode", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_CountryCode", f.Value, 0, 7, false, 1, 0),
		}
	}),
	mp.NewField("dme6_statusbit", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			flag("DME6_StatusBit", f.Value, 0),
		}
	}),
	mp.NewField("dme6_counter", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME6_Counter", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("dme6_data", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME6_Data", f.Value, 0, 16, false, 1, 0),
		}
	}),
}

// DME8_Version is 0x716 from DME.
// Motronic software version. ASCII '5e' in bytes 0-1.
var DME8_Version = mp.Message{
	mp.NewField("dme_sw_byte0", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_SW_Byte0", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("dme_sw_byte1", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_SW_Byte1", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("dme_sw_byte2", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_SW_Byte2", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("dme_sw_byte3", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_SW_Byte3", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("dme_sw_byte4", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_SW_Byte4", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("dme_sw_byte5", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_SW_Byte5", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("dme_sw_byte6", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_SW_Byte6", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("dme_sw_byte7", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("DME_SW_Byte7", f.Value, 0, 8, false, 1, 0),
		}
	}),
}

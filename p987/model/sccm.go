package model

import mp "github.com/gaucho-racing/mapache/mapache-go/v3"

// SCCM1 is 0xC2 from SCCM.
var SCCM1 = mp.Message{
	mp.NewField("bytes_0_1", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("SCCM_SteeringAngle", f.Value, 2, 13, false, 0.175, 0), // deg
			flag("SCCM_SteeringAngleSign", f.Value, 15),
		}
	}),
	mp.NewField("bytes_2_3", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("SCCM_SteeringAngleRate", f.Value, 2, 13, false, 0.175, 0), // deg/sec
			flag("SCCM_SteeringAngleRateSign", f.Value, 15),
		}
	}),
	mp.NewField("sccm_sensorid", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("SCCM_SensorID", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("sccm_counter", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("SCCM_Counter", f.Value, 4, 4, false, 1, 0),
		}
	}),
	mp.NewField("_reserved", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return nil
	}),
	mp.NewField("sccm_checksum", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("SCCM_Checksum", f.Value, 0, 8, false, 1, 0),
		}
	}),
}

// SCCM2 is 0x210 from SCCM.
var SCCM2 = mp.Message{
	mp.NewField("sccm_cruisecount1", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("SCCM_CruiseCount1", f.Value, 4, 4, false, 1, 0),
		}
	}),
	mp.NewField("bytes_1_1", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			flag("SCCM_CruiseEnable", f.Value, 0),
			flag("SCCM_CruiseDown", f.Value, 1),
			flag("SCCM_CruiseTowards", f.Value, 2),
			flag("SCCM_CruiseAway", f.Value, 3),
			flag("SCCM_CruiseTowardsHold", f.Value, 4),
			flag("SCCM_CruiseAwayHold", f.Value, 5),
			flag("SCCM_CruiseAvailable", f.Value, 7),
		}
	}),
	mp.NewField("bytes_2_2", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			flag("SCCM_CruiseUp", f.Value, 1),
			sig("SCCM_CruiseCount2", f.Value, 4, 4, false, 1, 0),
		}
	}),
	mp.NewField("_reserved", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return nil
	}),
}

// SCCM3 is 0x71A from SCCM.
var SCCM3 = mp.Message{
	mp.NewField("sccm3_b0", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("SCCM3_B0", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("sccm3_b1", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("SCCM3_B1", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("sccm3_b2", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("SCCM3_B2", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("sccm3_b3", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("SCCM3_B3", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("sccm3_b4", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("SCCM3_B4", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("sccm3_b5", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("SCCM3_B5", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("sccm3_b6", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("SCCM3_B6", f.Value, 0, 8, false, 1, 0),
		}
	}),
	mp.NewField("sccm3_b7", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			sig("SCCM3_B7", f.Value, 0, 8, false, 1, 0),
		}
	}),
}

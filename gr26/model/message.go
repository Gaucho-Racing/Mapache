package model

import mp "github.com/gaucho-racing/mapache/mapache-go/v3"

var messageMap = map[int]mp.Message{
	// GR Inverter
	0x013: InverterStatus1,
	0x014: InverterStatus2,
	0x015: InverterStatus3,
	0x016: InverterConfig,
	0x017: InverterCommand,
	// Fan
	0x018: FanStatus,
	0x019: FanCommand,
	// Dash
	0x01A: DashStatus,
	0x01B: DashConfig,
	// TCM
	0x029: TCMStatus,
	0x02A: TCMResourceUtil,
	// GPS
	0x030: DGPS_UVW,
	0x031: GPSLatitude,
	0x032: GPSLongitude,
	0x033: GPSAltitude,
	0x034: GPSPx,
	0x035: GPSQy,
	0x036: GPSRz,
	// DTI Inverter (custom CAN IDs)
	0x2016: DTIData1,
	0x2116: DTIData2,
	0x2216: DTIData3,
	0x2316: DTIData4,
	0x2416: DTIData5,
}

func GetMessage(id int) mp.Message {
	if msg, ok := messageMap[id]; ok {
		return msg
	}
	return nil
}

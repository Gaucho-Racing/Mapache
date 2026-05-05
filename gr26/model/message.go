package model

import mp "github.com/gaucho-racing/mapache/mapache-go/v3"

var messageMap = map[int]mp.Message{
	// ECU
	0x003: ECUStatus1,
	0x004: ECUStatus2,
	0x005: ECUStatus3,
	0x02D: ECUPingingRTT,
	0x02E: ECUAnalogData,
	// BCU
	0x007: BCUStatus1,
	0x008: BCUStatus2,
	0x009: BCUStatus3,
	0x00A: BCUPrecharge,
	0x00B: BCUConfigChargeParameters,
	0x00C: BCUConfigOperationalParameters,
	0x00D: BCUCellData1,
	0x00E: BCUCellData2,
	0x00F: BCUCellData3,
	0x010: BCUCellData4,
	0x011: BCUCellData5,
	// TCM
	0x02A: TCMResourceUtil,
	// GPS
	0x030: DGPS_UVW,
	0x031: GPSLatitude,
	0x032: GPSLongitude,
	0x033: GPSAltitude,
	0x034: GPSPx,
	0x035: GPSQy,
	0x036: GPSRz,
}

func GetMessage(id int) mp.Message {
	if msg, ok := messageMap[id]; ok {
		return msg
	}
	return nil
}

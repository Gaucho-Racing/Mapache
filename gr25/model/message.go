package model

import mp "github.com/gaucho-racing/mapache-go"

var messageMap = map[int]mp.Message{
	0x003: ECUStatusOne,
	0x004: ECUStatusTwo,
	0x005: ECUStatusThree,
	0x007: ACUStatusOne,
	0x008: ACUStatusTwo,
	0x009: ACUStatusThree,
	0x00A: ACUPrecharge,
	0x00B: ACUConfigChargeParameters,
	0x00C: ACUConfigOperationalParameters,
	0x00D: ACUCellDataOne,
	0x00E: ACUCellDataTwo,
	0x00F: ACUCellDataThree,
	0x010: ACUCellDataFour,
	0x011: ACUCellDataFive,
	0x012: DC_DCStatus,
	0x013: InverterStatusOne,
	0x014: InverterStatusTwo,
	0x015: InverterStatusThree,
	0x016: InverterConfig,
	0x017: InverterCommand,
	0x018: FanStatus,
	0x019: FanCommand,
	0x01A: DashPanel,
	0x01B: DashConfig,
	0x02A: TCMResourceUtil,
	0x02B: DashWarningFlags,
	0x02E: ECUPedals,
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

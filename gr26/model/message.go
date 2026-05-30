package model

import mp "github.com/gaucho-racing/mapache/mapache-go/v3"

var messageMap = map[int]mp.Message{
	// Per-node CAN heartbeat
	0x002: Ping,
	// ECU
	0x003: ECUStatus1,
	0x004: ECUStatus2,
	0x005: ECUStatus3,
	0x02D: ECUPingingRTT,
	0x02E: ECUAnalogData,
	0xC16: DTIDriveEnable,
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
	// Tire temp thermal frames (CAN-FD, FL/FR/RL/RR share IDs by node)
	0x037: TireTempFrame0,
	0x038: TireTempFrame1,
	0x039: TireTempFrame2,
	0x03A: TireTempFrame3,
	0x03B: TireTempFrame4,
	0x03C: TireTempFrame5,
	0x03D: TireTempFrame6,
	0x03E: TireTempFrame7,
	0x03F: TireTempFrame8,
	0x040: TireTempFrame9,
	0x041: TireTempFrame10,
	0x042: TireTempFrame11,
	0x043: TireTempFrame12,
	0x044: TireTempFrame13,
	0x045: TireTempFrame14,
	0x046: TireTempFrame15,
	0x047: TireTempFrame16,
	0x048: TireTempFrame17,
	0x049: TireTempFrame18,
	0x04A: TireTempFrame19,
	0x04B: TireTempFrame20,
	0x04C: TireTempFrame21,
	0x04D: TireTempFrame22,
	0x04E: TireTempFrame23,
	// Corner sensors (CAN-FD)
	0x04F: BrakeTemp,
	0x050: WheelSpeed,
	0x051: SuspensionIMUMagData,
	0x052: InboardFloorIMUToFData,
	// Energy Meter (Charger bus)
	0x10D: EMMeas,
	0x30D: EMTeamData1,
	0x30E: EMTeamData2,
	0x40D: EMStatus,
	0x60D: EMTemp,
	// Insulation Monitoring Device
	0x18FF01F4: IMDGeneral,
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

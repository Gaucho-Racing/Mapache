package model

import mp "github.com/gaucho-racing/mapache/mapache-go/v3"

// messageMap is the vehicle CAN decoder registry, transcribed from
// cayman_987.dbc in the TCM-987 repo. Ids not listed here are still
// persisted as raw frames.
var messageMap = map[int]mp.Message{
	// DME
	0x140: Heartbeat,
	0x242: DME1,
	0x245: DME2,
	0x246: DME3,
	0x303: DME_Lambda,
	0x308: DRIVEMODE,
	0x31F: DME_Status,
	0x441: DME4,
	0x470: DME_Torque,
	0x502: CLUSTER1,
	0x513: Immobilizer,
	0x62A: ECU_ID1,
	0x62F: ECU_Coding,
	0x669: DME6,
	0x716: DME8_Version,
	// Gateway
	0x70B: Gateway_Cfg,
	0x70D: Gateway_Net,
	0x719: Gateway_State,
	// KLIMO
	0x600: KLIMA,
	// PAS
	0x165: PAS,
	// PDK
	0x44C: PDK1,
	0x44F: PDK_Flags,
	// PSM
	0x14A: PSM1,
	0x24A: PSM2,
	0x44A: PSM3,
	0x44B: PSM4,
	0x718: PSM5,
	// SCCM
	0x0C2: SCCM1,
	0x210: SCCM2,
	0x71A: SCCM3,
}

// tcmMessageMap holds the TCM's synthetic frames, which are only valid on
// the "tcm" bus. The split matters: shelter injects its frames at 0x210
// and 0x211 through the relay's virtual CAN port, and 0x210 is also SCCM2
// on the car's own bus. Same id, different message, told apart only by
// which bus it arrived on.
var tcmMessageMap = map[int]mp.Message{
	MsgIDTCMStatus:    TCMStatus,
	MsgIDTCMResources: TCMResourceUtil,
}

// BusTCM is the label the relay publishes under for frames that never
// touched a physical CAN bus.
const BusTCM = "tcm"

// GetMessage returns the decoder for an id on a given bus, or nil when
// nothing is registered for it.
func GetMessage(bus string, id int) mp.Message {
	if bus == BusTCM {
		if msg, ok := tcmMessageMap[id]; ok {
			return msg
		}
		return nil
	}
	if msg, ok := messageMap[id]; ok {
		return msg
	}
	return nil
}

package model

import mp "github.com/gaucho-racing/mapache-go"

var messageMap = map[int]mp.Message{
	0x003: ECUStatusOne,
	0x004: ECUStatusTwo,
	0x005: ECUStatusThree,
	0x012: DC_DCStatus,
	0x013: InvStatus1,
	0x014: InvStatus2,
	0x015: InvStatus3,
	0x016: InvConfig,
	0x017: InvCommand,
	0x018: FanStatus,
	0x019: FanCommand,
	0x01A: DashStatus,
	0x01B: DashConfig,
	0x01C: SteeringStatus,
	0x01D: SteeringConfig,
}

func GetMessage(id int) mp.Message {
	if msg, ok := messageMap[id]; ok {
		return msg
	}
	return nil
}

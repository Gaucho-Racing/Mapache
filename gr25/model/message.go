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
}

func GetMessage(id int) mp.Message {
	if msg, ok := messageMap[id]; ok {
		return msg
	}
	return nil
}

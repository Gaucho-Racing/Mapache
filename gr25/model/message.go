package model

import mp "github.com/gaucho-racing/mapache-go"

var messageMap = map[int]mp.Message{
	0x003: ECUStatusOne,
	0x004: ECUStatusTwo,
	0x005: ECUStatusThree,
	0x02A: TCMResourceUtil,
}

func GetMessage(id int) mp.Message {
	if msg, ok := messageMap[id]; ok {
		return msg
	}
	return nil
}

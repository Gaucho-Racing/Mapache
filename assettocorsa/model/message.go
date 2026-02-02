package model

import mp "github.com/gaucho-racing/mapache-go"

var messageMap = map[int]mp.Message{
	0x02A: TCMResourceUtil,
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

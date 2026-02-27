package model

import mp "github.com/gaucho-racing/mapache-go"

var messageMap = map[int]mp.Message{
	0x001: VCM,
	0x003: dGPS,
	0x011: WheelFrontLeft,
	0x012: WheelFrontLeft,
	0x013: WheelRearLeft,
	0x014: WheelRearRight,

	0x088: SimWeather,
	0x099: LapStatus,
}

func GetMessage(id int) mp.Message {
	if msg, ok := messageMap[id]; ok {
		return msg
	}
	return nil
}

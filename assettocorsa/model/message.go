package model

import mp "github.com/gaucho-racing/mapache-go"

var messageMap = map[int]mp.Message{
	0x001: SimDriving,
	0x002: SimTyresBrakes,
	0x003: SimGForce,
	0x010: SimElectronics,
	0x012: SimRaceStatus,
	0x055: SimCarDamage,
	0x088: SimWeather,
	0x099: SimTiming,
}

func GetMessage(id int) mp.Message {
	if msg, ok := messageMap[id]; ok {
		return msg
	}
	return nil
}

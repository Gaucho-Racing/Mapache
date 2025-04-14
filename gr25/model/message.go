package model

import mp "github.com/gaucho-racing/mapache-go"

var messageMap = map[int]mp.Message{
	0x003: ECUStatusOne,
	0x004: ECUStatusTwo,
	0x005: ECUStatusThree,
	


	0x01e: SAMBrakeIR,        // 470
	0x01f: SAMTireTemp,       // 472
	0x020: SAMIMU,            // 477
	/*
	0x021: SAMGPS1,           // 484
	0x022: SAMGPS2,           // 487
	0x023: SAMGPSTime,        // 490
	0x024: SAMGPSHeading,     // 493
	*/
	0x025: SAMSusPots,        // 495
	0x026: SAMTOF,            // 497
	0x027: SAMRearWheelspeed, // 499
	0x028: SAMPushrodForce,   // 501 - 0x26?
	0x029: TCMStatus,              // 503
	0x02a: TCMResourceUtilization, // 512
	0x02b: DashWarningFlags, // 520
}

func GetMessage(id int) mp.Message {
	if msg, ok := messageMap[id]; ok {
		return msg
	}
	return nil
}

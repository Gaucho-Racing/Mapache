package model

import (
	"time"

	"github.com/gaucho-racing/mapache-go"
)

type Inverter struct {
	ID             string    `json:"id" gorm:"primaryKey"`
	VehicleID      string    `json:"vehicle_id"`
	CreatedAt      time.Time `json:"created_at" gorm:"autoCreateTime;precision:6"`
	ERPM           int       `json:"erpm"`
	DutyCycle      int       `json:"duty_cycle"`
	InputVoltage   int       `json:"input_voltage"`
	CurrentAC      int       `json:"ac_current"`
	CurrentDC      int       `json:"dc_current"`
	ControllerTemp int       `json:"controller_temp"`
	MotorTemp      int       `json:"motor_temp"`
	Faults         int       `json:"faults"`
	FOCID          int       `json:"foc_id"`
	FOCIQ          int       `json:"foc_iq"`
	Throttle       int       `json:"throttle"`
	Brake          int       `json:"brake"`
	DigitalIO      int       `json:"digital_io"`
	DriveEnable    int       `json:"drive_enable"`
	FlagsOne       int       `json:"flags_one"`
	FlagsTwo       int       `json:"flags_two"`
} //Does not include CAN VERSION or reserved

func (Inverter) TableName() string {
	return "gr24_inverter"
}

func NewInverterNode() mapache.Node {
	return []mapache.Field{
		mapache.NewField("ERPM", 4, mapache.Signed, mapache.BigEndian),
		mapache.NewField("DutyCycle", 2, mapache.Signed, mapache.BigEndian),
		mapache.NewField("InputVoltage", 2, mapache.Signed, mapache.BigEndian),
		mapache.NewField("CurrentAC", 2, mapache.Signed, mapache.BigEndian),
		mapache.NewField("CurrentDC", 2, mapache.Signed, mapache.BigEndian),
		mapache.NewField("useless DTI", 4, mapache.Signed, mapache.BigEndian), //DTI stuff
		mapache.NewField("ControllerTemp", 2, mapache.Signed, mapache.BigEndian),
		mapache.NewField("MotorTemp", 2, mapache.Signed, mapache.BigEndian),
		mapache.NewField("Faults", 1, mapache.Signed, mapache.BigEndian),
		mapache.NewField("useless DTI", 3, mapache.Signed, mapache.BigEndian), //DTI stuff
		mapache.NewField("FOCID", 4, mapache.Signed, mapache.BigEndian),
		mapache.NewField("FOCIQ", 4, mapache.Signed, mapache.BigEndian),
		mapache.NewField("Throttle", 1, mapache.Signed, mapache.BigEndian),
		mapache.NewField("Brake", 1, mapache.Signed, mapache.BigEndian),
		mapache.NewField("DigitalIO", 1, mapache.Signed, mapache.BigEndian),
		mapache.NewField("DriveEnable", 1, mapache.Signed, mapache.BigEndian),
		mapache.NewField("FlagsOne", 1, mapache.Signed, mapache.BigEndian),
		mapache.NewField("FlagsTwo", 1, mapache.Signed, mapache.BigEndian),
		mapache.NewField("useless DTI", 1, mapache.Signed, mapache.BigEndian), //DTI stuff
		mapache.NewField("CAn Version", 1, mapache.Signed, mapache.BigEndian),
		mapache.NewField("Millis", 4, mapache.Unsigned, mapache.BigEndian),
	}
}

package model

import (
	"time"

	"github.com/gaucho-racing/mapache-go"
)

type SteeringWheel struct {
	ID          string    `json:"id" gorm:"primaryKey"`
	VehicleID   string    `json:"vehicle_id"`
	CreatedAt   time.Time `json:"created_at" gorm:"autoCreateTime;precision:6"`
	PowerLevel  int       `json:"power_level"`
	TorqueMap   int       `json:"torque_map"`
	Regen       int       `json:"regen"`
	ButtonOne   int       `json:"button_one"`
	ButtonTwo   int       `json:"button_two"`
	ButtonThree int       `json:"button_three"`
	ButtonFour  int       `json:"button_four"`
}

func (SteeringWheel) TableName() string {
	return "gr24_steering_wheel" //is this good?
}

func NewSteeringWheelNode() mapache.Node {
	return []mapache.Field{
		{
			Name:   "PowerLevel",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "TorqueMap",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Regen",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Button1",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Button2",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Button3",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "ButtonFour",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
	}
}

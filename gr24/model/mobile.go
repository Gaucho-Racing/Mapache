package model

import (
	"time"

	"github.com/gaucho-racing/mapache-go"
)

type Mobile struct {
	ID             string    `json:"id" gorm:"primaryKey"`
	VehicleID      string    `json:"vehicle_id"`
	CreatedAt      time.Time `json:"created_at" gorm:"autoCreateTime;precision:6"`
	Latitude       float64   `json:"latitude"`
	Longitude      float64   `json:"longitude"`
	Altitude       float64   `json:"altitude"`
	Speed          float64   `json:"speed"`
	Heading        float64   `json:"heading"`
	AccelerometerX float64   `json:"accelerometer_x"`
	AccelerometerY float64   `json:"accelerometer_y"`
	AccelerometerZ float64   `json:"accelerometer_z"`
	GyroscopeX     float64   `json:"gyroscope_x"`
	GyroscopeY     float64   `json:"gyroscope_y"`
	GyroscopeZ     float64   `json:"gyroscope_z"`
	MagnetometerX  float64   `json:"magnetometer_x"`
	MagnetometerY  float64   `json:"magnetometer_y"`
	MagnetometerZ  float64   `json:"magnetometer_z"`
	Battery        int       `json:"battery"`
	Millis         int       `json:"millis" gorm:"index"`
}

func (Mobile) TableName() string {
	return "gr24_mobile"
}

func NewMobileNode() mapache.Node {
	return []mapache.Field{
		mapache.NewField("Latitude", 8, mapache.Signed, mapache.LittleEndian),
		mapache.NewField("Longitude", 8, mapache.Signed, mapache.LittleEndian),
		mapache.NewField("Altitude", 8, mapache.Signed, mapache.LittleEndian),
		mapache.NewField("Speed", 8, mapache.Signed, mapache.LittleEndian),
		mapache.NewField("Heading", 8, mapache.Signed, mapache.LittleEndian),
		mapache.NewField("AccelerometerX", 8, mapache.Signed, mapache.LittleEndian),
		mapache.NewField("AccelerometerY", 8, mapache.Signed, mapache.LittleEndian),
		mapache.NewField("AccelerometerZ", 8, mapache.Signed, mapache.LittleEndian),
		mapache.NewField("GyroscopeX", 8, mapache.Signed, mapache.LittleEndian),
		mapache.NewField("GyroscopeY", 8, mapache.Signed, mapache.LittleEndian),
		mapache.NewField("GyroscopeZ", 8, mapache.Signed, mapache.LittleEndian),
		mapache.NewField("MagnetometerX", 8, mapache.Signed, mapache.LittleEndian),
		mapache.NewField("MagnetometerY", 8, mapache.Signed, mapache.LittleEndian),
		mapache.NewField("MagnetometerZ", 8, mapache.Signed, mapache.LittleEndian),
		mapache.NewField("Battery", 1, mapache.Unsigned, mapache.LittleEndian),
		mapache.NewField("Millis", 4, mapache.Unsigned, mapache.LittleEndian),
	}
}

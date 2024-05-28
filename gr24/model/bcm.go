package model

import (
	"time"

	"github.com/gaucho-racing/mapache-go"
)

type BCM struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	VehicleID string    `json:"vehicle_id"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime;precision:6"`
	AccelX    float64   `json:"accel_x"`
	AccelY    float64   `json:"accel_y"`
	AccelZ    float64   `json:"accel_z"`
	GyroX     float64   `json:"gyro_x"`
	GyroY     float64   `json:"gyro_y"`
	GyroZ     float64   `json:"gyro_z"`
	Millis    int       `json:"millis"`
}

func (BCM) TableName() string {
	return "gr24_bcm"
}

func NewBCMNode() mapache.Node {
	return []mapache.Field{
		{
			Name:   "AccelX",
			Size:   2,
			Sign:   mapache.Signed,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "AccelY",
			Size:   2,
			Sign:   mapache.Signed,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "AccelZ",
			Size:   2,
			Sign:   mapache.Signed,
			Endian: mapache.BigEndian,
		},
		mapache.NewField("blank", 2, mapache.Unsigned, mapache.BigEndian),
		{
			Name:   "GyroX",
			Size:   2,
			Sign:   mapache.Signed,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "GyroY",
			Size:   2,
			Sign:   mapache.Signed,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "GyroZ",
			Size:   2,
			Sign:   mapache.Signed,
			Endian: mapache.BigEndian,
		},
		mapache.NewField("blank", 2, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Millis", 4, mapache.Unsigned, mapache.BigEndian),
	}
}

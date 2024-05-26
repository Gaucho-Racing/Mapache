package model

import (
	"time"

	"github.com/gaucho-racing/mapache-go"
)

type Wheel struct {
	ID           string    `json:"id" gorm:"primaryKey"`
	VehicleID    string    `json:"vehicle_id"`
	CreatedAt    time.Time `json:"created_at" gorm:"autoCreateTime;precision:6"`
	Location     string    `json:"wheel_location"`
	Suspension   int       `json:"suspension"`
	WheelSpeed   float64   `json:"wheel_speed"`
	AccelX       float64   `json:"imu_accel_x"`
	AccelY       float64   `json:"imu_accel_y"`
	AccelZ       float64   `json:"imu_accel_z"`
	GyroX        float64   `json:"imu_gyro_x"`
	GyroY        float64   `json:"imu_gyro_y"`
	GyroZ        float64   `json:"imu_gyro_z"`
	BrakeTempOne int       `json:"brake_temp_one"`
	BrakeTempTwo int       `json:"brake_temp_two"`
	TireTempOne  int       `json:"tire_temp_one"`
	TireTempTwo  int       `json:"tire_temp_two"`
}

func (Wheel) TableName() string {
	return "gr24_wheel"
}

func NewWheelNode() mapache.Node {
	return []mapache.Field{
		{
			Name:   "Suspension",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "WheelSpeed",
			Size:   2,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
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
		{
			Name:   "BrakeTempOne",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "BrakeTempTwo",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "TireTempOne",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "TireTempTwo",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
	}
}

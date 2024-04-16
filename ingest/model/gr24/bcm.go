package gr24model

import "time"

type BCM struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	Millis    int       `json:"millis" gorm:"index"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime;precision:6"`
	// Frame 1 - 20
	Wheels []Wheel `json:"wheels" gorm:"-"`
	// Frame 21 - ID:69408
	AccelerationX float64 `json:"acceleration_x"`
	AccelerationY float64 `json:"acceleration_y"`
	AccelerationZ float64 `json:"acceleration_z"`
	// Frame 22 - ID:69409
	GyroX float64 `json:"gyro_x"`
	GyroY float64 `json:"gyro_y"`
	GyroZ float64 `json:"gyro_z"`
	// Frame 23 - ID:69410
	MagX float64 `json:"mag_x"`
	MagY float64 `json:"mag_y"`
	MagZ float64 `json:"mag_z"`
}

func (BCM) TableName() string {
	return "gr24_bcm"
}

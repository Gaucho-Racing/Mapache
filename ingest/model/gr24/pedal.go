package gr24model

import (
	"time"
)

type Pedal struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	Millis    int       `json:"millis" gorm:"index"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime;precision:6"`
	// Frame 1 - ID:200
	APPSOne            float64 `json:"apps_one"`
	APPSTwo            float64 `json:"apps_two"`
	BrakePressureFront float64 `json:"brake_pressure_front"`
	BrakePressureRear  float64 `json:"brake_pressure_rear"`
}

func (Pedal) TableName() string {
	return "gr24_pedal"
}

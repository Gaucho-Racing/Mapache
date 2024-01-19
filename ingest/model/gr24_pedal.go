package model

import (
	"time"
)

type GR24Pedal struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	Millis    int       `json:"millis" gorm:"index"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime;precision:6"`
	// Frame 1 - ID:200
	APPSOne            int `json:"apps_one"`
	APPSTwo            int `json:"apps_two"`
	BrakePressureFront int `json:"brake_pressure_front"`
	BrakePressureRear  int `json:"brake_pressure_rear"`
}

func (GR24Pedal) TableName() string {
	return "gr24_pedal"
}

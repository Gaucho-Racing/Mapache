package model

import (
	"time"
)

type Ping struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	VehicleID string    `json:"vehicle_id"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime;precision:6"`
	Ping      int64     `json:"ping"`
	Pong      int64     `json:"pong"`
	Delta     int64     `json:"delta"`
}

func (Ping) TableName() string {
	return "gr24_ping"
}

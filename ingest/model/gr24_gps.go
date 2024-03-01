package model

import (
	"time"
)

type GR24Gps struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	Millis    int       `json:"millis" gorm:"index"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime;precision:6"`
	Latitude  float64   `json:"latitude"`
	Longitude float64   `json:"longitude"`
}

func (GR24Gps) TableName() string {
	return "gr24_gps"
}

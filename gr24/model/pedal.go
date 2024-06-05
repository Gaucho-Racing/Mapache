package model

import (
	"time"

	"github.com/gaucho-racing/mapache-go"
)

type Pedal struct {
	ID         string    `json:"id" gorm:"primaryKey"`
	VehicleID  string    `json:"vehicle_id"`
	CreatedAt  time.Time `json:"created_at" gorm:"autoCreateTime;precision:6"`
	AppsOne    float64   `json:"apps_one"`
	AppsTwo    float64   `json:"apps_two"`
	AppsOneRaw int       `json:"apps_one_raw"`
	AppsTwoRaw int       `json:"apps_two_raw"`
	Millis     int       `json:"millis" gorm:"index"`
}

func (Pedal) TableName() string {
	return "gr24_pedal"
}

func NewPedalNode() mapache.Node {
	return []mapache.Field{
		mapache.NewField("AppsOne", 2, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("AppsTwo", 2, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("classic gr wasting data", 12, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Millis", 4, mapache.Unsigned, mapache.BigEndian),
	}
}

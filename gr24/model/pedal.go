package model

import (
	"time"

	"github.com/gaucho-racing/mapache-go"
)

type Pedal struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime;precision:6"`
	AppsOne   float64   `json:"apps_one"`
	AppsTwo   float64   `json:"apps_two"`
	Millis    int       `json:"millis" gorm:"index"`
}

func (Pedal) TableName() string {
	return "gr24_pedal"
}

func NewPedalNode() mapache.Node {
	return []mapache.Field{
		{
			Name:   "AppsOne",
			Size:   2,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "AppsTwo",
			Size:   2,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Millis",
			Size:   4,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
	}
}

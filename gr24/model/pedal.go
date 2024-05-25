package model

import (
	"fmt"

	"github.com/gaucho-racing/mapache"
)

type Pedal struct {
	ID        string  `json:"id" gorm:"primaryKey"`
	CreatedAt string  `json:"created_at" gorm:"autoCreateTime;precision:6"`
	AppsOne   float64 `json:"apps_one"`
	AppsTwo   float64 `json:"apps_two"`
	Millis    int     `json:"millis" gorm:"index"`
}

func (Pedal) TableName() string {
	return "gr24_pedal"
}

func NewPedalNode() Node {
	return []mapache.Field{
		{
			Name:   "AppsOne",
			Length: 2,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "AppsTwo",
			Length: 2,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Millis",
			Length: 4,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
	}
}

type Node []mapache.Field

func (n Node) Length() int {
	length := 0
	for _, field := range n {
		length += field.Length
	}
	return length
}

func (n Node) FillFromBytes(data []byte) error {
	if len(data) != n.Length() {
		return fmt.Errorf("invalid data length, expected %d bytes", n.Length())
	}
	counter := 0
	for i, field := range n {
		field.Bytes = data[counter : counter+field.Length]
		counter += field.Length
		field.Value = field.Decode()
		n[i] = field
	}
	return nil
}

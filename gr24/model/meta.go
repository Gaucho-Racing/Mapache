package model

import (
	"time"

	"github.com/google/uuid"
)

type Meta struct {
	ID        uuid.UUID `json:"id" gorm:"primaryKey"`
	Service   string    `json:"service" gorm:"index"`
	Version   string    `json:"string"`
	Level     string    `json:"level"`
	Message   string    `json:"message"`
	CreatedAt time.Time `json:"time" gorm:"autoCreateTime;precision:6"`
}

func (Meta) TableName() string {
	return "meta"
}

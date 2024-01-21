package model

import (
	"time"
)

type Vehicle struct {
	ID          string    `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name" gorm:"index"`
	Description string    `json:"description"`
	UploadKey   string    `json:"upload_key"`
	CreatedAt   time.Time `json:"created_at" gorm:"autoCreateTime;precision:6"`
}

func (Vehicle) TableName() string {
	return "vehicle"
}

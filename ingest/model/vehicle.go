package model

import (
	"time"
)

type Vehicle struct {
	ID          string    `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name" gorm:"index"`
	Description string    `json:"description"`
	UploadKey   string    `json:"upload_key"`
	CreatedAt   time.Time `json:"time" gorm:"autoCreateTime;precision:6"`
}

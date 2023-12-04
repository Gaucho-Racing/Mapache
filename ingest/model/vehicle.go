package model

import (
	"github.com/google/uuid"
	"time"
)

type Vehicle struct {
	ID          uuid.UUID `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name" gorm:"index"`
	Description string    `json:"description"`
	UploadKey   string    `json:"upload_key"`
	CreatedAt   time.Time `json:"time" gorm:"autoCreateTime;precision:6"`
}

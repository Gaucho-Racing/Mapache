package model

import "time"

type Trip struct {
	ID          string    `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name" gorm:"index"`
	Description string    `json:"description"`
	VehicleID   string    `json:"vehicle_id"`
	CreatedAt   time.Time `json:"created_at" gorm:"autoCreateTime;precision:6"`
}

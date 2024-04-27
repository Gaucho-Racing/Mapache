package model

import "time"

type Trip struct {
	ID          string    `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	VehicleID   string    `json:"vehicle_id" gorm:"index"`
	StartTime   time.Time `json:"start_time" gorm:"precision:6"`
	EndTime     time.Time `json:"end_time" gorm:"precision:6"`
	UpdatedAt   time.Time `json:"updated_at" gorm:"autoUpdateTime;precision:6"`
	CreatedAt   time.Time `json:"created_at" gorm:"autoCreateTime;precision:6"`
}

func (Trip) TableName() string {
	return "trip"
}

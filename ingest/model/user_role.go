package model

import "time"

type UserRole struct {
	UserID    string    `json:"user_id" gorm:"index"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"time" gorm:"autoCreateTime;precision:6"`
}

func (UserRole) TableName() string {
	return "user_role"
}

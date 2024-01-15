package model

import "time"

type User struct {
	ID        string     `json:"id" gorm:"primaryKey"`
	FirstName string     `json:"first_name" gorm:"index"`
	LastName  string     `json:"last_name"`
	Email     string     `json:"email"`
	Subteam   string     `json:"subteam"`
	UpdatedAt time.Time  `json:"updated_at" gorm:"autoUpdateTime;precision:6"`
	CreatedAt time.Time  `json:"created_at" gorm:"autoCreateTime;precision:6"`
	Roles     []UserRole `json:"roles" gorm:"-"`
}

func (User) TableName() string {
	return "user"
}

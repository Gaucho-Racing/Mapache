package model

import "time"

type User struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	FirstName string    `json:"first_name" gorm:"index"`
	LastName  string    `json:"last_name"`
	Email     string    `json:"email"`
	Subteam   string    `json:"subteam"`
	CreatedAt time.Time `json:"time" gorm:"autoCreateTime;precision:6"`
}

func (User) TableName() string {
	return "user"
}

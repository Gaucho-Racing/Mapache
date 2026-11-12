package model

import "time"

type User struct {
	ID          string     `json:"id" gorm:"primaryKey"`
	Email       string     `json:"email"`
	Name        string     `json:"name"`
	AvatarURL   *string    `json:"avatar_url" gorm:"column:avatar_url"`
	LastLoginAt *time.Time `json:"last_login_at"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

func (User) TableName() string { return "auth.users" }

type UserPassword struct {
	UserID    string    `json:"user_id" gorm:"primaryKey"`
	Hash      string    `json:"-"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (UserPassword) TableName() string { return "auth.user_passwords" }

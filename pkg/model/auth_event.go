package model

import "time"

type AuthEventKind string

const (
	AuthEventLoginSucceeded AuthEventKind = "login_succeeded"
	AuthEventLoginFailed    AuthEventKind = "login_failed"
	AuthEventRefreshed      AuthEventKind = "refreshed"
	AuthEventLoggedOut      AuthEventKind = "logged_out"
)

type AuthMethod string

const AuthMethodPassword AuthMethod = "password"

type AuthEvent struct {
	ID        string        `json:"id" gorm:"primaryKey"`
	EntityID  *string       `json:"entity_id"`
	Event     AuthEventKind `json:"event"`
	Method    AuthMethod    `json:"method"`
	Email     *string       `json:"email"`
	TokenJTI  *string       `json:"token_jti" gorm:"column:token_jti"`
	IP        string        `json:"ip" gorm:"column:ip"`
	UserAgent string        `json:"user_agent"`
	CreatedAt time.Time     `json:"created_at"`
}

func (AuthEvent) TableName() string { return "auth.auth_events" }

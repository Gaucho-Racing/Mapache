package model

import "time"

type EntityType string

const (
	EntityTypeUser           EntityType = "user"
	EntityTypeServiceAccount EntityType = "service_account"
)

type Entity struct {
	ID         string     `json:"id" gorm:"primaryKey"`
	Type       EntityType `json:"type"`
	DisabledAt *time.Time `json:"disabled_at"`
	CreatedAt  time.Time  `json:"created_at"`
}

func (Entity) TableName() string { return "auth.entities" }

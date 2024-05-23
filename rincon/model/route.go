package model

import (
	"rincon/config"
	"time"
)

type Route struct {
	Route       string    `json:"route" gorm:"primaryKey"`
	ServiceName string    `json:"service_name"`
	CreatedAt   time.Time `json:"created_at" gorm:"autoCreateTime"`
}

func (Route) TableName() string {
	return config.DatabaseTablePrefix + "route"
}

type RouteNode struct {
	ID          string    `json:"id" gorm:"primaryKey"`
	Path        string    `json:"path"`
	ServiceName string    `json:"service_name"`
	CreatedAt   time.Time `json:"created_at" gorm:"autoCreateTime"`
}

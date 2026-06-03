package model

import "time"

// Schedule is a recurring job template. The foreman scheduler enqueues a
// job of the given kind every IntervalSec. Producers register schedules
// at startup (idempotent upsert on Name), so the recurrence definition
// lives in code on the producer side, not in a manual migration.
type Schedule struct {
	ID   string `json:"id" gorm:"primaryKey"`
	Name string `json:"name" gorm:"uniqueIndex;not null"`

	Kind        string `json:"kind" gorm:"not null"`
	Queue       string `json:"queue" gorm:"not null;default:default"`
	Service     string `json:"service"`
	Params      []byte `json:"params,omitempty" gorm:"type:jsonb"`
	Priority    int    `json:"priority" gorm:"not null;default:0"`
	MaxAttempts int    `json:"max_attempts" gorm:"not null;default:1"`

	IntervalSec int  `json:"interval_sec" gorm:"not null"`
	Enabled     bool `json:"enabled" gorm:"not null;default:true"`

	NextRunAt time.Time `json:"next_run_at" gorm:"index"`
	LastJobID *string   `json:"last_job_id,omitempty"`

	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime;precision:6"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime;precision:6"`
}

func (Schedule) TableName() string { return "job_schedules" }

package model

import "time"

const (
	StatusPending   = "pending"
	StatusRunning   = "running"
	StatusSucceeded = "succeeded"
	StatusFailed    = "failed"
	StatusCancelled = "cancelled"
)

// Job is one unit of work in the foreman queue. Producers enqueue jobs
// (status pending); workers claim them by kind, lease them, and report
// progress + outcome. The (kind, idempotency_key) unique index is the
// dedup lock — a second enqueue of the same logical unit is rejected.
type Job struct {
	ID    string `json:"id" gorm:"primaryKey"`
	Kind  string `json:"kind" gorm:"uniqueIndex:idx_jobs_kind_idem;index:idx_jobs_claim,priority:2;not null"`
	Queue string `json:"queue" gorm:"index;not null;default:default"`
	// Service is the producer that enqueued the job (e.g. "gr26"), purely
	// informational for the dashboard — any worker may claim any kind.
	Service string `json:"service" gorm:"index"`
	Status  string `json:"status" gorm:"index:idx_jobs_claim,priority:1;not null"`

	// IdempotencyKey is unique within a kind. Nullable: ad-hoc jobs may
	// skip dedup. This is what replaces bespoke "already processed" tables.
	IdempotencyKey *string `json:"idempotency_key,omitempty" gorm:"uniqueIndex:idx_jobs_kind_idem"`

	Params []byte `json:"params,omitempty" gorm:"type:jsonb"`
	Result []byte `json:"result,omitempty" gorm:"type:jsonb"`
	Error  string `json:"error,omitempty"`

	Priority        int    `json:"priority" gorm:"not null;default:0"`
	ProgressCurrent int64  `json:"progress_current" gorm:"not null;default:0"`
	ProgressTotal   int64  `json:"progress_total" gorm:"not null;default:0"`
	ProgressMessage string `json:"progress_message,omitempty"`

	Attempt     int `json:"attempt" gorm:"not null;default:0"`
	MaxAttempts int `json:"max_attempts" gorm:"not null;default:1"`

	WorkerID       string     `json:"worker_id,omitempty"`
	LeaseExpiresAt *time.Time `json:"lease_expires_at,omitempty" gorm:"index"`

	CancelRequested bool `json:"cancel_requested" gorm:"not null;default:false"`

	// ScheduledAt gates visibility to claim: a job is claimable only once
	// now >= scheduled_at. Used for retry backoff and delayed enqueue.
	ScheduledAt *time.Time `json:"scheduled_at,omitempty" gorm:"index:idx_jobs_claim,priority:3"`
	StartedAt   *time.Time `json:"started_at,omitempty"`
	FinishedAt  *time.Time `json:"finished_at,omitempty"`

	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime;precision:6"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime;precision:6"`
}

func (Job) TableName() string { return "jobs" }

func (j Job) IsTerminal() bool {
	return j.Status == StatusSucceeded || j.Status == StatusFailed || j.Status == StatusCancelled
}

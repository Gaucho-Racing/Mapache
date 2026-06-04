package service

import (
	"errors"
	"time"

	"github.com/gaucho-racing/mapache/foreman/config"
	"github.com/gaucho-racing/mapache/foreman/database"
	"github.com/gaucho-racing/mapache/foreman/model"

	ulid "github.com/gaucho-racing/ulid-go"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var (
	// ErrConflict is returned by Enqueue when a job with the same
	// (kind, idempotency_key) already exists; the existing job is returned
	// alongside so the caller can decide to skip.
	ErrConflict = errors.New("job already exists for idempotency key")
	// ErrNotFound is returned when no job matches the given id.
	ErrNotFound = errors.New("job not found")
	// ErrNotOwned is returned by lease-scoped mutations (heartbeat,
	// complete, fail) when the job is no longer running under the calling
	// worker — it was reclaimed by the reaper, cancelled, or finished.
	ErrNotOwned = errors.New("job not running under this worker")
)

type EnqueueParams struct {
	Kind           string
	Queue          string
	Service        string
	IdempotencyKey *string
	Params         model.JSON
	Priority       int
	MaxAttempts    int
	ScheduledAt    *time.Time
}

type ProgressUpdate struct {
	Current *int64
	Total   *int64
	Message *string
}

func Enqueue(p EnqueueParams) (model.Job, error) {
	return enqueueTx(database.DB, p)
}

func enqueueTx(tx *gorm.DB, p EnqueueParams) (model.Job, error) {
	if p.Queue == "" {
		p.Queue = "default"
	}
	if p.MaxAttempts < 1 {
		p.MaxAttempts = 1
	}
	job := model.Job{
		ID:             ulid.Make().Prefixed("job"),
		Kind:           p.Kind,
		Queue:          p.Queue,
		Service:        p.Service,
		Status:         model.StatusPending,
		IdempotencyKey: p.IdempotencyKey,
		Params:         p.Params,
		Priority:       p.Priority,
		MaxAttempts:    p.MaxAttempts,
		ScheduledAt:    p.ScheduledAt,
	}

	if p.IdempotencyKey == nil {
		if err := tx.Create(&job).Error; err != nil {
			return model.Job{}, err
		}
		return job, nil
	}

	res := tx.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "kind"}, {Name: "idempotency_key"}},
		DoNothing: true,
	}).Create(&job)
	if res.Error != nil {
		return model.Job{}, res.Error
	}
	if res.RowsAffected == 0 {
		existing, err := getByIdempotency(tx, p.Kind, *p.IdempotencyKey)
		if err != nil {
			return model.Job{}, err
		}
		return existing, ErrConflict
	}
	return job, nil
}

func getByIdempotency(tx *gorm.DB, kind, key string) (model.Job, error) {
	var job model.Job
	if err := tx.Where("kind = ? AND idempotency_key = ?", kind, key).First(&job).Error; err != nil {
		return model.Job{}, err
	}
	return job, nil
}

type ClaimParams struct {
	Kinds    []string
	Queues   []string
	WorkerID string
	LeaseSec int
}

// Claim atomically leases the highest-priority eligible pending job to the
// caller using SELECT ... FOR UPDATE SKIP LOCKED, so concurrent workers
// never grab the same job. Returns (job, true) on success or (_, false)
// when nothing is claimable.
func Claim(p ClaimParams) (model.Job, bool, error) {
	if len(p.Kinds) == 0 {
		return model.Job{}, false, nil
	}
	if p.LeaseSec <= 0 {
		p.LeaseSec = config.DefaultLeaseSec
	}
	lease := time.Now().Add(time.Duration(p.LeaseSec) * time.Second)

	sql := `
		UPDATE jobs SET
			status = 'running',
			worker_id = ?,
			attempt = attempt + 1,
			lease_expires_at = ?,
			started_at = COALESCE(started_at, now()),
			updated_at = now()
		WHERE id = (
			SELECT id FROM jobs
			WHERE status = 'pending'
			  AND kind IN ?
			  AND (? OR queue IN ?)
			  AND (scheduled_at IS NULL OR scheduled_at <= now())
			ORDER BY priority DESC, created_at ASC
			FOR UPDATE SKIP LOCKED
			LIMIT 1
		)
		RETURNING *;`

	noQueueFilter := len(p.Queues) == 0
	queues := p.Queues
	if noQueueFilter {
		queues = []string{""} // placeholder; guarded by the boolean
	}

	var job model.Job
	res := database.DB.Raw(sql, p.WorkerID, lease, p.Kinds, noQueueFilter, queues).Scan(&job)
	if res.Error != nil {
		return model.Job{}, false, res.Error
	}
	if res.RowsAffected == 0 {
		return model.Job{}, false, nil
	}
	return job, true, nil
}

func Heartbeat(id, workerID string, prog ProgressUpdate, leaseSec int) (model.Job, error) {
	if leaseSec <= 0 {
		leaseSec = config.DefaultLeaseSec
	}
	updates := map[string]any{
		"lease_expires_at": time.Now().Add(time.Duration(leaseSec) * time.Second),
		"updated_at":       time.Now(),
	}
	applyProgress(updates, prog)

	res := database.DB.Model(&model.Job{}).
		Where("id = ? AND status = ? AND worker_id = ?", id, model.StatusRunning, workerID).
		Updates(updates)
	if res.Error != nil {
		return model.Job{}, res.Error
	}
	if res.RowsAffected == 0 {
		return model.Job{}, notRunningErr(id)
	}
	return Get(id)
}

func Complete(id, workerID string, result model.JSON) (model.Job, error) {
	updates := map[string]any{
		"status":      model.StatusSucceeded,
		"finished_at": time.Now(),
		"updated_at":  time.Now(),
	}
	if result != nil {
		updates["result"] = result
	}
	res := database.DB.Model(&model.Job{}).
		Where("id = ? AND status = ? AND worker_id = ?", id, model.StatusRunning, workerID).
		Updates(updates)
	if res.Error != nil {
		return model.Job{}, res.Error
	}
	if res.RowsAffected == 0 {
		return model.Job{}, notRunningErr(id)
	}
	return Get(id)
}

// Fail records a failed attempt. When retryable and attempts remain, the
// job returns to pending with a backoff delay; otherwise it is marked
// failed terminally.
func Fail(id, workerID, errMsg string, retryable bool, backoff time.Duration) (model.Job, error) {
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		var job model.Job
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ? AND status = ? AND worker_id = ?", id, model.StatusRunning, workerID).
			First(&job).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrNotOwned
			}
			return err
		}

		updates := map[string]any{"error": errMsg, "updated_at": time.Now()}
		if retryable && job.Attempt < job.MaxAttempts {
			updates["status"] = model.StatusPending
			updates["worker_id"] = ""
			updates["lease_expires_at"] = nil
			updates["scheduled_at"] = time.Now().Add(backoff)
		} else {
			updates["status"] = model.StatusFailed
			updates["finished_at"] = time.Now()
		}
		return tx.Model(&model.Job{}).Where("id = ?", id).Updates(updates).Error
	})
	if err != nil {
		return model.Job{}, err
	}
	return Get(id)
}

// Cancel cancels a pending job immediately, or flags a running job for
// cooperative cancellation (the worker observes cancel_requested on its
// next heartbeat and stops). Terminal jobs are returned unchanged.
func Cancel(id string) (model.Job, error) {
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		var job model.Job
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ?", id).First(&job).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrNotFound
			}
			return err
		}
		switch job.Status {
		case model.StatusPending:
			return tx.Model(&model.Job{}).Where("id = ?", id).Updates(map[string]any{
				"status":      model.StatusCancelled,
				"finished_at": time.Now(),
				"updated_at":  time.Now(),
			}).Error
		case model.StatusRunning:
			return tx.Model(&model.Job{}).Where("id = ?", id).Updates(map[string]any{
				"cancel_requested": true,
				"updated_at":       time.Now(),
			}).Error
		default:
			return nil
		}
	})
	if err != nil {
		return model.Job{}, err
	}
	return Get(id)
}

func Get(id string) (model.Job, error) {
	var job model.Job
	if err := database.DB.Where("id = ?", id).First(&job).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return model.Job{}, ErrNotFound
		}
		return model.Job{}, err
	}
	return job, nil
}

type ListFilter struct {
	Status  string
	Kind    string
	Service string
	Queue   string
	Limit   int
	Cursor  string // job id; returns rows older than this (keyset on id desc)
}

func List(f ListFilter) ([]model.Job, error) {
	q := database.DB.Model(&model.Job{})
	if f.Status != "" {
		q = q.Where("status = ?", f.Status)
	}
	if f.Kind != "" {
		q = q.Where("kind = ?", f.Kind)
	}
	if f.Service != "" {
		q = q.Where("service = ?", f.Service)
	}
	if f.Queue != "" {
		q = q.Where("queue = ?", f.Queue)
	}
	if f.Cursor != "" {
		q = q.Where("id < ?", f.Cursor)
	}
	limit := f.Limit
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	var jobs []model.Job
	if err := q.Order("id DESC").Limit(limit).Find(&jobs).Error; err != nil {
		return nil, err
	}
	return jobs, nil
}

func applyProgress(updates map[string]any, prog ProgressUpdate) {
	if prog.Current != nil {
		updates["progress_current"] = *prog.Current
	}
	if prog.Total != nil {
		updates["progress_total"] = *prog.Total
	}
	if prog.Message != nil {
		updates["progress_message"] = *prog.Message
	}
}

// notRunningErr disambiguates a zero-row lease mutation: a missing job is
// ErrNotFound, an existing-but-not-owned/terminal job is ErrNotOwned.
func notRunningErr(id string) error {
	if _, err := Get(id); errors.Is(err, ErrNotFound) {
		return ErrNotFound
	}
	return ErrNotOwned
}

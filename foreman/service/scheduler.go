package service

import (
	"fmt"
	"time"

	"github.com/gaucho-racing/mapache/foreman/config"
	"github.com/gaucho-racing/mapache/foreman/database"
	"github.com/gaucho-racing/mapache/foreman/model"
	"github.com/gaucho-racing/mapache/foreman/pkg/logger"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// StartScheduler enqueues a job for every due schedule on a fixed tick.
// The enqueue + next_run advance happen in one transaction with the
// schedule row locked (SKIP LOCKED), so multiple foreman instances never
// double-enqueue the same tick. The per-tick idempotency key gives a
// second layer of protection at the jobs table.
func StartScheduler() {
	interval := time.Duration(config.SchedulerIntervalSec) * time.Second
	logger.SugarLogger.Infof("[SCHEDULER] starting (tick=%s)", interval)
	go func() {
		for {
			if n, err := tickSchedules(); err != nil {
				logger.SugarLogger.Errorf("[SCHEDULER] tick failed: %v", err)
			} else if n > 0 {
				logger.SugarLogger.Infof("[SCHEDULER] enqueued %d scheduled job(s)", n)
			}
			time.Sleep(interval)
		}
	}()
}

func tickSchedules() (int, error) {
	enqueued := 0
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		var due []model.Schedule
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE", Options: "SKIP LOCKED"}).
			Where("enabled = true AND next_run_at <= now()").
			Find(&due).Error; err != nil {
			return err
		}
		for _, s := range due {
			key := fmt.Sprintf("sched:%s:%d", s.Name, s.NextRunAt.Unix())
			job, err := enqueueTx(tx, EnqueueParams{
				Kind:           s.Kind,
				Queue:          s.Queue,
				Service:        s.Service,
				IdempotencyKey: &key,
				Params:         s.Params,
				Priority:       s.Priority,
				MaxAttempts:    s.MaxAttempts,
			})
			if err != nil && err != ErrConflict {
				return err
			}

			next := s.NextRunAt.Add(time.Duration(s.IntervalSec) * time.Second)
			if !next.After(time.Now()) {
				next = time.Now().Add(time.Duration(s.IntervalSec) * time.Second)
			}
			if err := tx.Model(&model.Schedule{}).Where("id = ?", s.ID).Updates(map[string]any{
				"next_run_at": next,
				"last_job_id": job.ID,
				"updated_at":  time.Now(),
			}).Error; err != nil {
				return err
			}
			enqueued++
		}
		return nil
	})
	return enqueued, err
}

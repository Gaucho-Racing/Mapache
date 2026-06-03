package service

import (
	"time"

	"github.com/gaucho-racing/mapache/foreman/config"
	"github.com/gaucho-racing/mapache/foreman/database"
	"github.com/gaucho-racing/mapache/foreman/pkg/logger"
)

// StartReaper sweeps running jobs whose lease has expired (the worker
// crashed or stalled). Jobs with attempts remaining return to pending for
// re-claim; exhausted ones are failed terminally.
func StartReaper() {
	interval := time.Duration(config.ReaperIntervalSec) * time.Second
	logger.SugarLogger.Infof("[REAPER] starting (tick=%s)", interval)
	go func() {
		for {
			if n, err := reapExpired(); err != nil {
				logger.SugarLogger.Errorf("[REAPER] sweep failed: %v", err)
			} else if n > 0 {
				logger.SugarLogger.Warnf("[REAPER] reclaimed %d expired lease(s)", n)
			}
			time.Sleep(interval)
		}
	}()
}

func reapExpired() (int64, error) {
	sql := `
		UPDATE jobs SET
			status      = CASE WHEN attempt < max_attempts THEN 'pending' ELSE 'failed' END,
			worker_id   = CASE WHEN attempt < max_attempts THEN '' ELSE worker_id END,
			scheduled_at = CASE WHEN attempt < max_attempts THEN now() ELSE scheduled_at END,
			finished_at = CASE WHEN attempt < max_attempts THEN NULL ELSE now() END,
			error       = CASE WHEN attempt < max_attempts THEN error ELSE 'lease expired' END,
			lease_expires_at = NULL,
			updated_at  = now()
		WHERE status = 'running'
		  AND lease_expires_at IS NOT NULL
		  AND lease_expires_at < now();`
	res := database.DB.Exec(sql)
	return res.RowsAffected, res.Error
}

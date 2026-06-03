package service

import (
	"errors"
	"time"

	"github.com/gaucho-racing/mapache/foreman/database"
	"github.com/gaucho-racing/mapache/foreman/model"

	ulid "github.com/gaucho-racing/ulid-go"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// UpsertSchedule registers or updates a recurring job definition, keyed on
// Name. Producers call this at startup. An existing schedule's NextRunAt is
// preserved so re-registration doesn't disturb the cadence.
func UpsertSchedule(s model.Schedule) (model.Schedule, error) {
	if s.Queue == "" {
		s.Queue = "default"
	}
	if s.MaxAttempts < 1 {
		s.MaxAttempts = 1
	}
	s.ID = ulid.Make().Prefixed("sched")
	s.NextRunAt = time.Now()

	err := database.DB.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "name"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"kind", "queue", "service", "params", "priority",
			"max_attempts", "interval_sec", "enabled", "updated_at",
		}),
	}).Create(&s).Error
	if err != nil {
		return model.Schedule{}, err
	}
	return GetScheduleByName(s.Name)
}

func GetScheduleByName(name string) (model.Schedule, error) {
	var s model.Schedule
	if err := database.DB.Where("name = ?", name).First(&s).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return model.Schedule{}, ErrNotFound
		}
		return model.Schedule{}, err
	}
	return s, nil
}

func ListSchedules() ([]model.Schedule, error) {
	var schedules []model.Schedule
	if err := database.DB.Order("name ASC").Find(&schedules).Error; err != nil {
		return nil, err
	}
	return schedules, nil
}

package service

import (
	mapache "github.com/gaucho-racing/mapache/mapache-go/v3"
	"github.com/gaucho-racing/mapache/vehicle/database"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// sessionUpsertColumns are the non-id columns refreshed when upserting an
// existing session row.
var sessionUpsertColumns = []string{
	"vehicle_id", "name", "description", "start_time", "end_time", "analysis",
}

func GetAllSessionsPaged(limit, offset int) []mapache.Session {
	var sessions []mapache.Session
	database.DB.Order("start_time DESC").Limit(limit).Offset(offset).Find(&sessions)
	for i := range sessions {
		populateSession(&sessions[i])
	}
	return sessions
}

func GetAllSessionsByVehicleID(vehicleID string) []mapache.Session {
	var sessions []mapache.Session
	database.DB.Where("vehicle_id = ?", vehicleID).Find(&sessions)
	summaries := GetLapSummariesByVehicle(vehicleID)
	for i := range sessions {
		populateSession(&sessions[i])
		if summary, ok := summaries[sessions[i].ID]; ok {
			s := summary
			sessions[i].LapSummary = &s
		}
	}
	return sessions
}

func GetSessionsByVehicleIDPaged(vehicleID string, limit, offset int) []mapache.Session {
	var sessions []mapache.Session
	database.DB.Where("vehicle_id = ?", vehicleID).Order("start_time DESC").Limit(limit).Offset(offset).Find(&sessions)
	summaries := GetLapSummariesByVehicle(vehicleID)
	for i := range sessions {
		populateSession(&sessions[i])
		if summary, ok := summaries[sessions[i].ID]; ok {
			s := summary
			sessions[i].LapSummary = &s
		}
	}
	return sessions
}

func GetAllOngoingSessions() []mapache.Session {
	var sessions []mapache.Session
	database.DB.Where("start_time = end_time").Find(&sessions)
	for i := range sessions {
		populateSession(&sessions[i])
	}
	return sessions
}

func GetAllOngoingSessionsByVehicleID(vehicleID string) []mapache.Session {
	var sessions []mapache.Session
	database.DB.Where("start_time = end_time AND vehicle_id = ?", vehicleID).Find(&sessions)
	for i := range sessions {
		populateSession(&sessions[i])
	}
	return sessions
}

func GetSessionByID(id string) mapache.Session {
	var session mapache.Session
	database.DB.Where("id = ?", id).First(&session)
	populateSession(&session)
	return session
}

// CreateSession upserts on the primary key. Using ON CONFLICT (rather than
// catching a duplicate-key error and retrying with an UPDATE) keeps the write
// to a single statement, which also makes it safe to reuse inside the analysis
// save transaction, where a failed INSERT would otherwise abort the whole tx.
func CreateSession(session mapache.Session) error {
	return database.DB.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		DoUpdates: clause.AssignmentColumns(sessionUpsertColumns),
	}).Create(&session).Error
}

// SaveSessionAnalysisAndLaps upserts the session (geometry/analysis blob) and
// replaces its laps in a single transaction, so a mid-save failure can't leave
// the analysis and the session_lap table inconsistent. It mirrors CreateSession's
// insert-or-update behavior for the session row.
func SaveSessionAnalysisAndLaps(session mapache.Session, laps []mapache.Lap) error {
	return database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns(sessionUpsertColumns),
		}).Create(&session).Error; err != nil {
			return err
		}
		return replaceLapsTx(tx, session.ID, laps)
	})
}

func DeleteSession(id string) error {
	result := database.DB.Where("id = ?", id).Delete(&mapache.Session{})
	if result.Error != nil {
		return result.Error
	}
	result = database.DB.Where("session_id = ?", id).Delete(&mapache.Marker{})
	if result.Error != nil {
		return result.Error
	}
	if err := DeleteLapsForSession(id); err != nil {
		return err
	}
	return nil
}

// populateSession attaches the laps the frontend Session model actually reads.
// Markers/Segments (and the DeriveSegments compute they fed) are dropped: the
// fields are gorm:"-" (never persisted), no Go caller reads them, and the
// frontend Session model has no markers/segments fields, so computing them on
// every read was dead work. DeriveSegments itself remains for direct callers.
func populateSession(session *mapache.Session) {
	session.Laps = GetLapsForSession(session.ID)
}

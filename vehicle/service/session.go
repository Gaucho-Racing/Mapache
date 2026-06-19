package service

import (
	"strings"

	mapache "github.com/gaucho-racing/mapache/mapache-go/v3"
	"github.com/gaucho-racing/mapache/vehicle/database"
	"gorm.io/gorm"
)

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

func CreateSession(session mapache.Session) error {
	result := database.DB.Create(&session)
	if result.Error != nil {
		if strings.Contains(result.Error.Error(), "duplicate key") {
			result = database.DB.Where("id = ?", session.ID).Updates(&session)
			if result.Error != nil {
				return result.Error
			}
		} else {
			return result.Error
		}
	}
	return nil
}

// SaveSessionAnalysisAndLaps upserts the session (geometry/analysis blob) and
// replaces its laps in a single transaction, so a mid-save failure can't leave
// the analysis and the session_lap table inconsistent. It mirrors CreateSession's
// insert-or-update behavior for the session row.
func SaveSessionAnalysisAndLaps(session mapache.Session, laps []mapache.Lap) error {
	return database.DB.Transaction(func(tx *gorm.DB) error {
		result := tx.Create(&session)
		if result.Error != nil {
			if strings.Contains(result.Error.Error(), "duplicate key") {
				if err := tx.Where("id = ?", session.ID).Updates(&session).Error; err != nil {
					return err
				}
			} else {
				return result.Error
			}
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

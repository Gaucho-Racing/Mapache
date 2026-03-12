package service

import (
	"strings"

	mapache "github.com/gaucho-racing/mapache/mapache-go"
	"github.com/gaucho-racing/mapache/vehicle/database"
)

func GetAllSessions() []mapache.Session {
	var sessions []mapache.Session
	database.DB.Find(&sessions)
	for i := range sessions {
		populateSession(&sessions[i])
	}
	return sessions
}

func GetAllSessionsByVehicleID(vehicleID string) []mapache.Session {
	var sessions []mapache.Session
	database.DB.Where("vehicle_id = ?", vehicleID).Find(&sessions)
	for i := range sessions {
		populateSession(&sessions[i])
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

func DeleteSession(id string) error {
	result := database.DB.Where("id = ?", id).Delete(&mapache.Session{})
	if result.Error != nil {
		return result.Error
	}
	result = database.DB.Where("session_id = ?", id).Delete(&mapache.Marker{})
	if result.Error != nil {
		return result.Error
	}
	return nil
}

func populateSession(session *mapache.Session) {
	session.Markers = GetAllMarkersForSession(session.ID)
	session.Segments = mapache.DeriveSegments(*session)
}

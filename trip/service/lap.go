package service

import (
	"trip/database"

	"github.com/gaucho-racing/mapache-go"
	"github.com/google/uuid"
)

func GetAllLapsForTrip(tripID string) []mapache.Lap {
	var laps []mapache.Lap
	database.DB.Where("trip_id = ?", tripID).Find(&laps)
	return laps
}

func CreateLap(lap mapache.Lap) error {
	lap.ID = uuid.New().String()
	result := database.DB.Create(&lap)
	if result.Error != nil {
		return result.Error
	}
	return nil
}

func DeleteLap(lapID string) error {
	result := database.DB.Where("id = ?", lapID).Delete(&mapache.Lap{})
	if result.Error != nil {
		return result.Error
	}
	return nil
}

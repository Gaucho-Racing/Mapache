package service

import (
	"ingest/database"
	"ingest/model"
	"strings"
)

func GetAllTrips() []model.Trip {
	var trips []model.Trip
	database.DB.Find(&trips)
	return trips
}

func GetAllTripsByVehicleID(vehicleID string) []model.Trip {
	var trips []model.Trip
	database.DB.Where("vehicle_id = ?", vehicleID).Find(&trips)
	return trips
}

func GetAllOngoingTrips() []model.Trip {
	var trips []model.Trip
	database.DB.Where("start_time = end_time").Find(&trips)
	return trips
}

func GetAllOngoingTripsByVehicleID(vehicleID string) []model.Trip {
	var trips []model.Trip
	database.DB.Where("start_time = end_time AND vehicle_id = ?", vehicleID).Find(&trips)
	return trips
}

func GetTripByID(id string) model.Trip {
	var trip model.Trip
	database.DB.Where("id = ?", id).First(&trip)
	return trip
}

func CreateTrip(trip model.Trip) error {
	result := database.DB.Create(&trip)
	if result.Error != nil {
		if strings.Contains(result.Error.Error(), "Duplicate entry") {
			result = database.DB.Where("id = ?", trip.ID).Updates(&trip)
			if result.Error != nil {
				return result.Error
			}
		} else {
			return result.Error
		}
	}
	return nil
}

package service

import (
	"jeddah/database"
	"strings"

	"github.com/gaucho-racing/mapache-go"
)

func GetAllTrips() []mapache.Trip {
	var trips []mapache.Trip
	database.DB.Find(&trips)
	return trips
}

func GetAllTripsByVehicleID(vehicleID string) []mapache.Trip {
	var trips []mapache.Trip
	database.DB.Where("vehicle_id = ?", vehicleID).Find(&trips)
	for i := range trips {
		trips[i].Laps = GetAllLapsForTrip(trips[i].ID)
	}
	return trips
}

func GetAllOngoingTrips() []mapache.Trip {
	var trips []mapache.Trip
	database.DB.Where("start_time = end_time").Find(&trips)
	for i := range trips {
		trips[i].Laps = GetAllLapsForTrip(trips[i].ID)
	}
	return trips
}

func GetAllOngoingTripsByVehicleID(vehicleID string) []mapache.Trip {
	var trips []mapache.Trip
	database.DB.Where("start_time = end_time AND vehicle_id = ?", vehicleID).Find(&trips)
	for i := range trips {
		trips[i].Laps = GetAllLapsForTrip(trips[i].ID)
	}
	return trips
}

func GetTripByID(id string) mapache.Trip {
	var trip mapache.Trip
	database.DB.Where("id = ?", id).First(&trip)
	trip.Laps = GetAllLapsForTrip(trip.ID)
	return trip
}

func CreateTrip(trip mapache.Trip) error {
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

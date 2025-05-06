package service

import (
	"strings"
	"trip/database"

	"github.com/gaucho-racing/mapache-go"
)

func GetAllVehicles() []mapache.Vehicle {
	var vehicles []mapache.Vehicle
	database.DB.Find(&vehicles)
	return vehicles
}

func GetVehicleByID(id string) mapache.Vehicle {
	var vehicle mapache.Vehicle
	database.DB.Where("id = ?", id).First(&vehicle)
	return vehicle
}

func CreateVehicle(vehicle mapache.Vehicle) error {
	result := database.DB.Create(&vehicle)
	if result.Error != nil {
		if strings.Contains(result.Error.Error(), "Duplicate entry") {
			result = database.DB.Where("id = ?", vehicle.ID).Updates(&vehicle)
		}
	}
	return result.Error
}

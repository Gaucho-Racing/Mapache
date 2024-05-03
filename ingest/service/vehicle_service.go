package service

import (
	"ingest/database"
	"ingest/model"
	"strings"
)

func GetAllVehicles() []model.Vehicle {
	var vehicles []model.Vehicle
	database.DB.Find(&vehicles)
	return vehicles
}

func GetVehicleByID(id string) model.Vehicle {
	var vehicle model.Vehicle
	database.DB.Where("id = ?", id).First(&vehicle)
	return vehicle
}

func CreateVehicle(vehicle model.Vehicle) error {
	result := database.DB.Create(&vehicle)
	if result.Error != nil {
		if strings.Contains(result.Error.Error(), "Duplicate entry") {
			result = database.DB.Where("id = ?", vehicle.ID).Updates(&vehicle)
		} else {
			return result.Error
		}
	}
	return nil
}

package service

import (
	"ingest/model"
	"strings"
)

func GetAllVehicles() []model.Vehicle {
	var vehicles []model.Vehicle
	DB.Find(&vehicles)
	return vehicles
}

func GetVehicleByID(id string) model.Vehicle {
	var vehicle model.Vehicle
	DB.Where("id = ?", id).First(&vehicle)
	return vehicle
}

func CreateVehicle(vehicle model.Vehicle) error {
	result := DB.Create(&vehicle)
	if result.Error != nil {
		if strings.Contains(result.Error.Error(), "Duplicate entry") {
			result = DB.Where("id = ?", vehicle.ID).Updates(&vehicle)
			if result.Error != nil {
				return result.Error
			}
		} else {
			return result.Error
		}
	}
	return nil
}

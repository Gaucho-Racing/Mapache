package service

import (
	"ingest/model"
	"ingest/utils"
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
	if DB.Where("id = ?", vehicle.ID).Updates(&vehicle).RowsAffected == 0 {
		utils.SugarLogger.Infoln("New vehicle created with id: " + vehicle.ID)
		if result := DB.Create(&vehicle); result.Error != nil {
			return result.Error
		}
	} else {
		utils.SugarLogger.Infoln("Vehicle with id: " + vehicle.ID + " has been updated!")
	}
	return nil
}

package service

import (
	"github.com/gaucho-racing/mapache/vehicle/database"

	mapache "github.com/gaucho-racing/mapache/mapache-go/v3"
	"gorm.io/gorm/clause"
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

// CreateVehicle upserts on the primary key. The previous implementation
// caught duplicate-key errors by matching the literal string "Duplicate
// entry" — that's MySQL's wording; Postgres uses "duplicate key value
// violates unique constraint", so the update fallback never fired and
// every edit surfaced SQLSTATE 23505 to the user.
func CreateVehicle(vehicle mapache.Vehicle) error {
	return database.DB.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		DoUpdates: clause.AssignmentColumns([]string{"name", "description", "type", "upload_key"}),
	}).Create(&vehicle).Error
}

func DeleteVehicle(vehicleID string) error {
	result := database.DB.Where("id = ?", vehicleID).Delete(&mapache.Vehicle{})
	return result.Error
}

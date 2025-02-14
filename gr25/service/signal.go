package service

import (
	"fmt"
	"gr25/database"
	"gr25/utils"

	"github.com/gaucho-racing/mapache-go"
	"go.uber.org/zap"
)

func GetSignal(timestamp int, vehicleID string, name string) mapache.Signal {
	var signal mapache.Signal
	database.DB.Where("timestamp = ?", timestamp).Where("vehicle_id = ?", vehicleID).Where("name = ?", name).First(&signal)
	return signal
}

func CreateSignal(signal mapache.Signal) error {
	if signal.Timestamp == 0 {
		return fmt.Errorf("signal timestamp cannot be 0")
	}
	if signal.VehicleID == "" {
		return fmt.Errorf("signal vehicle id cannot be empty")
	}
	if signal.Name == "" {
		return fmt.Errorf("signal name cannot be empty")
	}
	if database.DB.Where("timestamp = ?", signal.Timestamp).Where("vehicle_id = ?", signal.VehicleID).Where("name = ?", signal.Name).Updates(&signal).RowsAffected == 0 {
		utils.SugarLogger.Infow("[DB] New signal created", []zap.Field{
			zap.Int("timestamp", signal.Timestamp),
			zap.String("vehicle_id", signal.VehicleID),
			zap.String("name", signal.Name),
		})
		if result := database.DB.Create(&signal); result.Error != nil {
			return result.Error
		}
	} else {
		utils.SugarLogger.Infow("[DB] Existing signal updated", []zap.Field{
			zap.Int("timestamp", signal.Timestamp),
			zap.String("vehicle_id", signal.VehicleID),
			zap.String("name", signal.Name),
		})
	}
	return nil
}

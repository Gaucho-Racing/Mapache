package service

import (
	"fmt"

	"github.com/gaucho-racing/mapache/gr26/config"
	"github.com/gaucho-racing/mapache/gr26/database"
	"github.com/gaucho-racing/mapache/gr26/pkg/logger"

	mapache "github.com/gaucho-racing/mapache/mapache-go/v3"
	ulid "github.com/gaucho-racing/ulid-go"
	"gorm.io/gorm/clause"
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
	signal.ID = ulid.Make().Prefixed("sgnl")
	if config.EnableSignalWS {
		Hub.Publish(signal)
	}
	if config.EnableSignalDB {
		if database.DB.Where("timestamp = ?", signal.Timestamp).Where("vehicle_id = ?", signal.VehicleID).Where("name = ?", signal.Name).Updates(&signal).RowsAffected == 0 {
			logger.SugarLogger.Infow("[DB] New signal created",
				"timestamp", signal.Timestamp,
				"vehicle_id", signal.VehicleID,
				"name", signal.Name,
			)
			if result := database.DB.Create(&signal); result.Error != nil {
				return result.Error
			}
		} else {
			logger.SugarLogger.Infow("[DB] Existing signal updated",
				"timestamp", signal.Timestamp,
				"vehicle_id", signal.VehicleID,
				"name", signal.Name,
			)
		}
	}
	return nil
}

func CreateSignals(signals []mapache.Signal) error {
	for i := range signals {
		if signals[i].Timestamp == 0 {
			return fmt.Errorf("signal timestamp cannot be 0")
		}
		if signals[i].VehicleID == "" {
			return fmt.Errorf("signal vehicle id cannot be empty")
		}
		if signals[i].Name == "" {
			return fmt.Errorf("signal name cannot be empty")
		}
		signals[i].ID = ulid.Make().Prefixed("sgnl")
	}
	if config.EnableSignalWS {
		for _, signal := range signals {
			Hub.Publish(signal)
		}
	}
	if config.EnableSignalDB {
		result := database.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "timestamp"}, {Name: "vehicle_id"}, {Name: "name"}},
			DoUpdates: clause.AssignmentColumns([]string{"id", "value", "raw_value", "produced_at"}),
		}).Create(&signals)
		if result.Error != nil {
			return result.Error
		}
	}
	return nil
}

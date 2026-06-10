package service

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/gaucho-racing/mapache/vehicle/database"
	"github.com/gaucho-racing/mapache/vehicle/model"
	"github.com/gaucho-racing/mapache/vehicle/pkg/logger"

	mapache "github.com/gaucho-racing/mapache/mapache-go/v3"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var (
	ErrInvalidVehicleType = errors.New("unknown vehicle type")
	ErrVehicleNotFound    = errors.New("vehicle not found")
	ErrFlagNotFound       = errors.New("config flag not defined for vehicle type")
)

// ---- Flag definitions (scoped to a vehicle type) ----

func GetAllFlags() []model.ConfigFlag {
	var flags []model.ConfigFlag
	database.DB.Order("vehicle_type, key").Find(&flags)
	return flags
}

func GetFlagsForType(vehicleType string) []model.ConfigFlag {
	var flags []model.ConfigFlag
	database.DB.Where("vehicle_type = ?", vehicleType).Order("key").Find(&flags)
	return flags
}

func GetFlag(vehicleType, key string) (model.ConfigFlag, bool) {
	var f model.ConfigFlag
	if err := database.DB.Where("vehicle_type = ? AND key = ?", vehicleType, key).First(&f).Error; err != nil {
		return model.ConfigFlag{}, false
	}
	return f, true
}

// UpsertFlag creates or updates a flag definition for a vehicle type. The
// vehicle type must be known and the default value must decode as the declared
// value type.
func UpsertFlag(flag model.ConfigFlag) error {
	if !model.IsValidVehicleType(flag.VehicleType) {
		return ErrInvalidVehicleType
	}
	if err := model.ValidateValue(flag.ValueType, flag.DefaultValue); err != nil {
		return fmt.Errorf("invalid default value: %w", err)
	}
	return database.DB.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "vehicle_type"}, {Name: "key"}},
		DoUpdates: clause.AssignmentColumns([]string{"value_type", "default_value", "description", "updated_at"}),
	}).Create(&flag).Error
}

// DeleteFlag removes a flag definition and cascades to every per-vehicle
// override of that key across vehicles of the type, in one transaction, so no
// orphaned overrides are left behind.
func DeleteFlag(vehicleType, key string) error {
	return database.DB.Transaction(func(tx *gorm.DB) error {
		var ids []string
		if err := tx.Model(&mapache.Vehicle{}).Where("type = ?", vehicleType).Pluck("id", &ids).Error; err != nil {
			return err
		}
		if len(ids) > 0 {
			if err := tx.Where("vehicle_id IN ? AND key = ?", ids, key).
				Delete(&model.VehicleConfigOverride{}).Error; err != nil {
				return err
			}
		}
		return tx.Where("vehicle_type = ? AND key = ?", vehicleType, key).
			Delete(&model.ConfigFlag{}).Error
	})
}

// ---- Per-vehicle overrides ----

func GetOverrides(vehicleID string) []model.VehicleConfigOverride {
	var o []model.VehicleConfigOverride
	database.DB.Where("vehicle_id = ?", vehicleID).Order("key").Find(&o)
	return o
}

// SetOverride pins a flag value for one vehicle. The flag must be defined for
// that vehicle's type and the value must match the flag's declared type.
func SetOverride(vehicleID, key, value string) error {
	v := GetVehicleByID(vehicleID)
	if v.ID == "" {
		return ErrVehicleNotFound
	}
	flag, ok := GetFlag(v.Type, key)
	if !ok {
		return ErrFlagNotFound
	}
	if err := model.ValidateValue(flag.ValueType, value); err != nil {
		return fmt.Errorf("invalid value for flag %q (%s): %w", key, flag.ValueType, err)
	}
	o := model.VehicleConfigOverride{VehicleID: vehicleID, Key: key, Value: value}
	return database.DB.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "vehicle_id"}, {Name: "key"}},
		DoUpdates: clause.AssignmentColumns([]string{"value", "updated_at"}),
	}).Create(&o).Error
}

func ClearOverride(vehicleID, key string) error {
	return database.DB.Where("vehicle_id = ? AND key = ?", vehicleID, key).
		Delete(&model.VehicleConfigOverride{}).Error
}

// ---- Snapshot + poll status ----

// BuildSnapshot resolves a vehicle's effective config: type-level defaults
// merged with the vehicle's overrides, hashed into a version. Non-fatal decode
// problems are logged, never surfaced to the car.
func BuildSnapshot(vehicleID string) (model.ConfigSnapshot, error) {
	v := GetVehicleByID(vehicleID)
	if v.ID == "" {
		return model.ConfigSnapshot{}, ErrVehicleNotFound
	}
	flags, errs := model.ComputeFlags(GetFlagsForType(v.Type), GetOverrides(vehicleID))
	for _, e := range errs {
		logger.SugarLogger.Warnf("[config] vehicle %s: %v", vehicleID, e)
	}
	return model.ConfigSnapshot{
		VehicleID:   vehicleID,
		GeneratedAt: time.Now(),
		Flags:       flags,
	}, nil
}

// ConfigUpdatedAt is when the vehicle's effective config last changed: the
// most recent update across its type's flag definitions and its own overrides.
// Zero time if the vehicle has no config at all.
func ConfigUpdatedAt(vehicleType, vehicleID string) time.Time {
	var flagT, ovrT sql.NullTime
	database.DB.Model(&model.ConfigFlag{}).Where("vehicle_type = ?", vehicleType).
		Select("max(updated_at)").Scan(&flagT)
	database.DB.Model(&model.VehicleConfigOverride{}).Where("vehicle_id = ?", vehicleID).
		Select("max(updated_at)").Scan(&ovrT)
	out := time.Time{}
	if flagT.Valid {
		out = flagT.Time
	}
	if ovrT.Valid && ovrT.Time.After(out) {
		out = ovrT.Time
	}
	return out
}

func GetStatus(vehicleID string) model.VehicleConfigStatus {
	var s model.VehicleConfigStatus
	database.DB.Where("vehicle_id = ?", vehicleID).First(&s)
	return s
}

// RecordSync stamps the vehicle's last successful config fetch. Called only
// when the car authenticates with its upload key, so it reflects the car
// checking in — not a dashboard read. Upserts the status row.
func RecordSync(vehicleID string) error {
	now := time.Now()
	status := model.VehicleConfigStatus{VehicleID: vehicleID, LastSyncedAt: now}
	return database.DB.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "vehicle_id"}},
		DoUpdates: clause.Assignments(map[string]any{"last_synced_at": now}),
	}).Create(&status).Error
}

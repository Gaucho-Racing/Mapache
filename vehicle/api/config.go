package api

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gaucho-racing/mapache/vehicle/model"
	"github.com/gaucho-racing/mapache/vehicle/pkg/logger"
	"github.com/gaucho-racing/mapache/vehicle/service"

	"github.com/gin-gonic/gin"
)

// GetVehicleTypes exposes the canonical vehicle-type list so the frontend's
// create-vehicle and flag dialogs don't hardcode it.
func GetVehicleTypes(c *gin.Context) {
	c.JSON(http.StatusOK, model.VehicleTypeOptions())
}

// ---- Flag definitions ----

func GetAllConfigFlags(c *gin.Context) {
	if t := c.Query("vehicle_type"); t != "" {
		c.JSON(http.StatusOK, service.GetFlagsForType(t))
		return
	}
	c.JSON(http.StatusOK, service.GetAllFlags())
}

func UpsertConfigFlag(c *gin.Context) {
	var flag model.ConfigFlag
	if err := c.ShouldBindJSON(&flag); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	if err := service.UpsertFlag(flag); err != nil {
		if errors.Is(err, service.ErrInvalidVehicleType) {
			c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, flag)
}

func DeleteConfigFlag(c *gin.Context) {
	if err := service.DeleteFlag(c.Param("vehicleType"), c.Param("key")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "flag deleted"})
}

// ---- Per-vehicle overrides ----

func GetVehicleConfigOverrides(c *gin.Context) {
	c.JSON(http.StatusOK, service.GetOverrides(c.Param("vehicleID")))
}

func SetVehicleConfigOverride(c *gin.Context) {
	var body struct {
		Value string `json:"value"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	err := service.SetOverride(c.Param("vehicleID"), c.Param("key"), body.Value)
	switch {
	case errors.Is(err, service.ErrVehicleNotFound):
		c.JSON(http.StatusNotFound, gin.H{"message": err.Error()})
	case errors.Is(err, service.ErrFlagNotFound):
		c.JSON(http.StatusNotFound, gin.H{"message": err.Error()})
	case err != nil:
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
	default:
		c.JSON(http.StatusOK, gin.H{"message": "override set"})
	}
}

func ClearVehicleConfigOverride(c *gin.Context) {
	if err := service.ClearOverride(c.Param("vehicleID"), c.Param("key")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "override cleared"})
}

// ---- Snapshot (the car's poll endpoint) + status ----

// GetVehicleConfig returns a vehicle's effective config. When the caller
// supplies the vehicle's upload key (?upload_key=), it's treated as the car
// checking in and the sync is recorded — the fetch is the ack. Reads without a
// key (e.g. the dashboard) just return config and don't count as a sync.
func GetVehicleConfig(c *gin.Context) {
	vehicleID := c.Param("vehicleID")
	snap, err := service.BuildSnapshot(vehicleID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": err.Error()})
		return
	}

	if key := c.Query("upload_key"); key != "" {
		v := service.GetVehicleByID(vehicleID)
		if key != strconv.Itoa(v.UploadKey) {
			c.JSON(http.StatusForbidden, gin.H{"message": "invalid upload key"})
			return
		}
		// Best-effort — never fail the poll over a status write.
		if err := service.RecordSync(vehicleID); err != nil {
			logger.SugarLogger.Warnf("[config] record sync for %s failed: %v", vehicleID, err)
		}
	}

	c.JSON(http.StatusOK, snap)
}

func GetVehicleConfigStatus(c *gin.Context) {
	vehicleID := c.Param("vehicleID")
	v := service.GetVehicleByID(vehicleID)
	if v.ID == "" {
		c.JSON(http.StatusNotFound, gin.H{"message": service.ErrVehicleNotFound.Error()})
		return
	}
	updatedAt := service.ConfigUpdatedAt(v.Type, vehicleID)
	status := service.GetStatus(vehicleID)
	// In sync when the car has synced at or after the last config change.
	inSync := !status.LastSyncedAt.IsZero() && !status.LastSyncedAt.Before(updatedAt)
	c.JSON(http.StatusOK, gin.H{
		"vehicle_id":        vehicleID,
		"in_sync":           inSync,
		"config_updated_at": updatedAt,
		"last_synced_at":    status.LastSyncedAt,
	})
}

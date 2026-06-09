package api

import (
	"errors"
	"net/http"

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

// GetVehicleConfig is the car's poll endpoint. It returns the effective
// snapshot, sets an ETag so an unchanged poll can return 304, and records the
// poll for liveness. The car echoes the version it last applied via
// ?applied_version= so the server can track drift.
func GetVehicleConfig(c *gin.Context) {
	snap, err := service.BuildSnapshot(c.Param("vehicleID"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": err.Error()})
		return
	}

	// Best-effort poll accounting — never fail the poll over a status write.
	if err := service.RecordPoll(snap.VehicleID, c.Query("applied_version")); err != nil {
		logger.SugarLogger.Warnf("[config] record poll for %s failed: %v", snap.VehicleID, err)
	}

	etag := `"` + snap.Version + `"`
	c.Header("ETag", etag)
	c.Header("Cache-Control", "no-cache")
	if match := c.GetHeader("If-None-Match"); match == etag {
		c.Status(http.StatusNotModified)
		return
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
	snap, _ := service.BuildSnapshot(vehicleID)
	status := service.GetStatus(vehicleID)
	c.JSON(http.StatusOK, gin.H{
		"vehicle_id":        vehicleID,
		"desired_version":   snap.Version,
		"applied_version":   status.AppliedVersion,
		"in_sync":           status.AppliedVersion == snap.Version,
		"config_updated_at": service.ConfigUpdatedAt(v.Type, vehicleID),
		"applied_at":        status.AppliedAt,
		"last_polled_at":    status.LastPolledAt,
	})
}

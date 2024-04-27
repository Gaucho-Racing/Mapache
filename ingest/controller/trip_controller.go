package controller

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"ingest/model"
	"ingest/service"
	"net/http"
	"strings"
	"time"
)

func GetAllTrips(c *gin.Context) {
	if service.GetRequestUserID(c) == "" {
		c.JSON(http.StatusForbidden, gin.H{"message": "You are not authorized to access this resource"})
		return
	}

	c.JSON(http.StatusOK, service.GetAllTrips())
}

func GetAllTripsByVehicleID(c *gin.Context) {
	if service.GetRequestUserID(c) == "" {
		c.JSON(http.StatusForbidden, gin.H{"message": "You are not authorized to access this resource"})
		return
	}
	vehicleID := strings.Split(c.FullPath(), "/")[1]
	c.JSON(http.StatusOK, service.GetAllTripsByVehicleID(vehicleID))
}

func GetAllOngoingTripsForVehicleID(c *gin.Context) {
	if service.GetRequestUserID(c) == "" {
		c.JSON(http.StatusForbidden, gin.H{"message": "You are not authorized to access this resource"})
		return
	}
	vehicleID := strings.Split(c.FullPath(), "/")[1]
	c.JSON(http.StatusOK, service.GetAllOngoingTripsByVehicleID(vehicleID))
}

func GetTripByID(c *gin.Context) {
	if service.GetRequestUserID(c) == "" {
		c.JSON(http.StatusForbidden, gin.H{"message": "You are not authorized to access this resource"})
		return
	}

	if c.Param("tripID") == "ongoing" {
		c.JSON(http.StatusOK, service.GetAllOngoingTrips())
		return
	}

	result := service.GetTripByID(c.Param("tripID"))
	if result.ID == "" {
		c.JSON(http.StatusNotFound, gin.H{"message": "No trip found with given id: " + c.Param("tripID")})
	} else {
		c.JSON(http.StatusOK, result)
	}
}

func CreateTrip(c *gin.Context) {
	if !(service.RequestUserHasRole(c, "ADMIN") || service.RequestUserHasRole(c, "VEHICLE_CREATE")) {
		c.JSON(http.StatusForbidden, gin.H{"message": "You are not authorized to edit this resource"})
		return
	}

	var input model.Trip
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	input.ID = c.Param("tripID")
	if input.ID == "new" {
		input.ID = uuid.NewString()
		now := time.Now()
		input.StartTime = now
		input.EndTime = now
	}
	vehicle := service.GetVehicleByID(input.VehicleID)
	if vehicle.ID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "No vehicle found with given id: " + input.VehicleID})
		return
	}
	err := service.CreateTrip(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, service.GetTripByID(input.ID))
}

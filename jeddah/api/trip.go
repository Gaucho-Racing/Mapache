package api

import (
	"jeddah/service"
	"net/http"
	"time"

	"github.com/gaucho-racing/mapache-go"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func GetAllTrips(c *gin.Context) {
	result := service.GetAllTrips()
	c.JSON(http.StatusOK, result)
}

func GetAllTripsByVehicleID(c *gin.Context) {
	result := service.GetAllTripsByVehicleID(c.Param("vehicleID"))
	c.JSON(http.StatusOK, result)
}

func GetAllOngoingTrips(c *gin.Context) {
	result := service.GetAllOngoingTrips()
	c.JSON(http.StatusOK, result)
}

func GetAllOngoingTripsByVehicleID(c *gin.Context) {
	result := service.GetAllOngoingTripsByVehicleID(c.Param("vehicleID"))
	c.JSON(http.StatusOK, result)
}

func GetTripByID(c *gin.Context) {
	result := service.GetTripByID(c.Param("tripID"))
	if result.ID == "" {
		c.JSON(http.StatusNotFound, gin.H{"message": "No trip found with given id: " + c.Param("tripID")})
	} else {
		c.JSON(http.StatusOK, result)
	}
}

func CreateTrip(c *gin.Context) {
	var input mapache.Trip
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	input.ID = c.Param("tripID")
	err := service.CreateTrip(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, service.GetTripByID(input.ID))
}

func NewTrip(c *gin.Context) {
	var input mapache.Trip
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	input.ID = uuid.New().String()
	now := time.Now()
	input.StartTime = now
	input.EndTime = now
	err := service.CreateTrip(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, service.GetTripByID(input.ID))
}

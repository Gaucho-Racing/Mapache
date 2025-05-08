package api

import (
	"fmt"
	"jeddah/config"

	"github.com/gin-gonic/gin"
)

func SetupRouter() *gin.Engine {
	if config.Env == "PROD" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.Default()
	return r
}

func InitializeRoutes(router *gin.Engine) {
	router.GET(fmt.Sprintf("/%s/ping", config.Service.Name), Ping)
	router.GET("/vehicles", GetAllVehicles)
	router.GET("/vehicles/:vehicleID", GetVehicleByID)
	router.POST("/vehicles/:vehicleID", CreateVehicle)
	router.DELETE("/vehicles/:vehicleID", DeleteVehicle)
	router.GET("/trips", GetAllTrips)
	router.GET("/trips/:tripID", GetTripByID)
	router.GET("/trips/vehicle/:vehicleID", GetAllTripsByVehicleID)
	router.GET("/trips/ongoing", GetAllOngoingTrips)
	router.GET("/trips/ongoing/:vehicleID", GetAllOngoingTripsByVehicleID)
	router.POST("/trips/:tripID", CreateTrip)
	router.POST("/trips/new", NewTrip)
	router.DELETE("/trips/:tripID", DeleteTrip)
	router.POST("/trips/:tripID/laps", CreateLap)
	router.DELETE("/trips/:tripID/laps/:lapID", DeleteLap)
}

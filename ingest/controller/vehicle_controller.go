package controller

import (
	"github.com/gin-gonic/gin"
	"ingest/model"
	"ingest/service"
	"net/http"
)

func GetAllVehicles(c *gin.Context) {
	if service.GetRequestUserID(c) == "" {
		c.JSON(http.StatusForbidden, gin.H{"message": "You are not authorized to access this resource"})
		return
	}

	result := service.GetAllVehicles()
	c.JSON(http.StatusOK, result)
}

func GetVehicleByID(c *gin.Context) {
	if service.GetRequestUserID(c) == "" {
		c.JSON(http.StatusForbidden, gin.H{"message": "You are not authorized to access this resource"})
		return
	}

	result := service.GetVehicleByID(c.Param("vehicleID"))
	if result.ID == "" {
		c.JSON(http.StatusNotFound, gin.H{"message": "No vehicle found with given id: " + c.Param("vehicleID")})
	} else {
		c.JSON(http.StatusOK, result)
	}
}

func CreateVehicle(c *gin.Context) {
	if !(service.RequestUserHasRole(c, "ADMIN") || service.RequestUserHasRole(c, "VEHICLE_CREATE")) {
		c.JSON(http.StatusForbidden, gin.H{"message": "You are not authorized to edit this resource"})
		return
	}

	var input model.Vehicle
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	input.ID = c.Param("vehicleID")
	err := service.CreateVehicle(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, service.GetVehicleByID(input.ID))
}

package api

import (
	"net/http"
	"trip/service"

	"github.com/gaucho-racing/mapache-go"
	"github.com/gin-gonic/gin"
)

func GetAllVehicles(c *gin.Context) {
	result := service.GetAllVehicles()
	c.JSON(http.StatusOK, result)
}

func GetVehicleByID(c *gin.Context) {
	result := service.GetVehicleByID(c.Param("vehicleID"))
	if result.ID == "" {
		c.JSON(http.StatusNotFound, gin.H{"message": "No vehicle found with given id: " + c.Param("vehicleID")})
	} else {
		c.JSON(http.StatusOK, result)
	}
}

func CreateVehicle(c *gin.Context) {
	var input mapache.Vehicle
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

func DeleteVehicle(c *gin.Context) {
	err := service.DeleteVehicle(c.Param("vehicleID"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Vehicle with id: " + c.Param("vehicleID") + " deleted successfully"})
}
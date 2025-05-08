package api

import (
	"jeddah/service"
	"net/http"

	"github.com/gaucho-racing/mapache-go"
	"github.com/gin-gonic/gin"
)

func CreateLap(c *gin.Context) {
	var input mapache.Lap
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	input.TripID = c.Param("tripID")
	err := service.CreateLap(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, input)
}

func DeleteLap(c *gin.Context) {
	err := service.DeleteLap(c.Param("lapID"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Lap with id: " + c.Param("lapID") + " deleted successfully"})
}

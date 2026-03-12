package api

import (
	"net/http"

	mapache "github.com/gaucho-racing/mapache/mapache-go"
	"github.com/gaucho-racing/mapache/vehicle/service"
	"github.com/gin-gonic/gin"
)

func CreateMarker(c *gin.Context) {
	var input mapache.Marker
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	input.SessionID = c.Param("sessionID")
	err := service.CreateMarker(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, input)
}

func DeleteMarker(c *gin.Context) {
	err := service.DeleteMarker(c.Param("markerID"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Marker with id: " + c.Param("markerID") + " deleted successfully"})
}

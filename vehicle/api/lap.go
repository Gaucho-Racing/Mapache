package api

import (
	"net/http"

	mapache "github.com/gaucho-racing/mapache/mapache-go/v3"
	"github.com/gaucho-racing/mapache/vehicle/service"
	"github.com/gin-gonic/gin"
)

func GetLapsForSession(c *gin.Context) {
	result := service.GetLapsForSession(c.Param("sessionID"))
	c.JSON(http.StatusOK, result)
}

func ReplaceLapsForSession(c *gin.Context) {
	var input struct {
		Laps []mapache.Lap `json:"laps"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	sessionID := c.Param("sessionID")
	if err := service.ReplaceLapsForSession(sessionID, input.Laps); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, service.GetLapsForSession(sessionID))
}

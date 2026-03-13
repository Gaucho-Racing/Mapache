package api

import (
	"net/http"
	"time"

	mapache "github.com/gaucho-racing/mapache/mapache-go/v3"
	ulid "github.com/gaucho-racing/ulid-go"
	"github.com/gaucho-racing/mapache/vehicle/service"
	"github.com/gin-gonic/gin"
)

func GetAllSessions(c *gin.Context) {
	param, exists := c.GetQuery("vehicle_id")
	if exists {
		result := service.GetAllSessionsByVehicleID(param)
		c.JSON(http.StatusOK, result)
	} else {
		result := service.GetAllSessions()
		c.JSON(http.StatusOK, result)
	}
}

func GetAllOngoingSessions(c *gin.Context) {
	param, exists := c.GetQuery("vehicle_id")
	if exists {
		result := service.GetAllOngoingSessionsByVehicleID(param)
		c.JSON(http.StatusOK, result)
	} else {
		result := service.GetAllOngoingSessions()
		c.JSON(http.StatusOK, result)
	}
}

func GetSessionByID(c *gin.Context) {
	result := service.GetSessionByID(c.Param("sessionID"))
	if result.ID == "" {
		c.JSON(http.StatusNotFound, gin.H{"message": "No session found with given id: " + c.Param("sessionID")})
	} else {
		c.JSON(http.StatusOK, result)
	}
}

func CreateSession(c *gin.Context) {
	var input mapache.Session
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	input.ID = c.Param("sessionID")
	err := service.CreateSession(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, service.GetSessionByID(input.ID))
}

func NewSession(c *gin.Context) {
	var input mapache.Session
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	input.ID = ulid.Make().Prefixed("ssn")
	now := time.Now()
	input.StartTime = now
	input.EndTime = now
	err := service.CreateSession(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, service.GetSessionByID(input.ID))
}

func DeleteSession(c *gin.Context) {
	err := service.DeleteSession(c.Param("sessionID"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Session with id: " + c.Param("sessionID") + " deleted successfully"})
}

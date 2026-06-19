package api

import (
	"net/http"
	"strconv"
	"time"

	mapache "github.com/gaucho-racing/mapache/mapache-go/v3"
	ulid "github.com/gaucho-racing/ulid-go"
	"github.com/gaucho-racing/mapache/vehicle/service"
	"github.com/gin-gonic/gin"
)

const maxSessionsPageLimit = 200

func GetAllSessions(c *gin.Context) {
	param, exists := c.GetQuery("vehicle_id")
	if exists {
		// Vehicle-scoped reads materialize each session (plus its laps/markers
		// via an N+1), so cap the default to the most recent page instead of the
		// whole vehicle's history. Callers can walk older sessions with
		// limit/offset.
		limit, _ := strconv.Atoi(c.Query("limit"))
		if limit <= 0 || limit > maxSessionsPageLimit {
			limit = maxSessionsPageLimit
		}
		offset, _ := strconv.Atoi(c.Query("offset"))
		if offset < 0 {
			offset = 0
		}
		result := service.GetSessionsByVehicleIDPaged(param, limit, offset)
		c.JSON(http.StatusOK, result)
	} else {
		// Unfiltered reads materialize every session (plus its laps/markers),
		// so cap the global path to the most recent page instead of the whole
		// table. Callers can walk older sessions with limit/offset.
		limit, _ := strconv.Atoi(c.Query("limit"))
		if limit <= 0 || limit > maxSessionsPageLimit {
			limit = maxSessionsPageLimit
		}
		offset, _ := strconv.Atoi(c.Query("offset"))
		if offset < 0 {
			offset = 0
		}
		result := service.GetAllSessionsPaged(limit, offset)
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

// SaveSessionAnalysis upserts a session and replaces its laps in one
// transaction (POST /sessions/:id/analysis), so analysis and laps can't drift
// apart on a partial save. The body is a session plus a laps array.
func SaveSessionAnalysis(c *gin.Context) {
	var input struct {
		mapache.Session
		Laps []mapache.Lap `json:"laps"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	input.Session.ID = c.Param("sessionID")
	if err := service.SaveSessionAnalysisAndLaps(input.Session, input.Laps); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, service.GetSessionByID(input.Session.ID))
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

package api

import (
	"encoding/json"
	"net/http"

	"github.com/gaucho-racing/mapache/foreman/model"
	"github.com/gaucho-racing/mapache/foreman/service"
	"github.com/gin-gonic/gin"
)

type upsertScheduleRequest struct {
	Name        string          `json:"name" binding:"required"`
	Kind        string          `json:"kind" binding:"required"`
	Queue       string          `json:"queue"`
	Service     string          `json:"service"`
	Params      json.RawMessage `json:"params"`
	Priority    int             `json:"priority"`
	MaxAttempts int             `json:"max_attempts"`
	IntervalSec int             `json:"interval_sec" binding:"required"`
	Enabled     *bool           `json:"enabled"`
}

func UpsertSchedule(c *gin.Context) {
	var req upsertScheduleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	enabled := true
	if req.Enabled != nil {
		enabled = *req.Enabled
	}
	schedule, err := service.UpsertSchedule(model.Schedule{
		Name:        req.Name,
		Kind:        req.Kind,
		Queue:       req.Queue,
		Service:     req.Service,
		Params:      req.Params,
		Priority:    req.Priority,
		MaxAttempts: req.MaxAttempts,
		IntervalSec: req.IntervalSec,
		Enabled:     enabled,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, schedule)
}

func ListSchedules(c *gin.Context) {
	schedules, err := service.ListSchedules()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, schedules)
}

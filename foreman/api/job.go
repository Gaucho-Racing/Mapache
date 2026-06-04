package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gaucho-racing/mapache/foreman/model"
	"github.com/gaucho-racing/mapache/foreman/service"
	"github.com/gin-gonic/gin"
)

type enqueueRequest struct {
	Kind           string          `json:"kind" binding:"required"`
	Queue          string          `json:"queue"`
	Service        string          `json:"service"`
	IdempotencyKey *string         `json:"idempotency_key"`
	Params         json.RawMessage `json:"params"`
	Priority       int             `json:"priority"`
	MaxAttempts    int             `json:"max_attempts"`
	ScheduledAt    *time.Time      `json:"scheduled_at"`
}

func EnqueueJob(c *gin.Context) {
	var req enqueueRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	job, err := service.Enqueue(service.EnqueueParams{
		Kind:           req.Kind,
		Queue:          req.Queue,
		Service:        req.Service,
		IdempotencyKey: req.IdempotencyKey,
		Params:         model.JSON(req.Params),
		Priority:       req.Priority,
		MaxAttempts:    req.MaxAttempts,
		ScheduledAt:    req.ScheduledAt,
	})
	if errors.Is(err, service.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{"conflict": true, "job": job})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, job)
}

type claimRequest struct {
	Kinds    []string `json:"kinds" binding:"required"`
	Queues   []string `json:"queues"`
	WorkerID string   `json:"worker_id" binding:"required"`
	LeaseSec int      `json:"lease_seconds"`
}

func ClaimJob(c *gin.Context) {
	var req claimRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	job, found, err := service.Claim(service.ClaimParams{
		Kinds:    req.Kinds,
		Queues:   req.Queues,
		WorkerID: req.WorkerID,
		LeaseSec: req.LeaseSec,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if !found {
		c.Status(http.StatusNoContent)
		return
	}
	c.JSON(http.StatusOK, job)
}

type heartbeatRequest struct {
	WorkerID        string  `json:"worker_id" binding:"required"`
	ProgressCurrent *int64  `json:"progress_current"`
	ProgressTotal   *int64  `json:"progress_total"`
	ProgressMessage *string `json:"progress_message"`
	LeaseSec        int     `json:"lease_seconds"`
}

func HeartbeatJob(c *gin.Context) {
	var req heartbeatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	job, err := service.Heartbeat(c.Param("id"), req.WorkerID, service.ProgressUpdate{
		Current: req.ProgressCurrent,
		Total:   req.ProgressTotal,
		Message: req.ProgressMessage,
	}, req.LeaseSec)
	if respondServiceErr(c, err) {
		return
	}
	c.JSON(http.StatusOK, job)
}

type completeRequest struct {
	WorkerID string          `json:"worker_id" binding:"required"`
	Result   json.RawMessage `json:"result"`
}

func CompleteJob(c *gin.Context) {
	var req completeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	job, err := service.Complete(c.Param("id"), req.WorkerID, model.JSON(req.Result))
	if respondServiceErr(c, err) {
		return
	}
	c.JSON(http.StatusOK, job)
}

type failRequest struct {
	WorkerID   string `json:"worker_id" binding:"required"`
	Error      string `json:"error"`
	Retryable  bool   `json:"retryable"`
	BackoffSec int    `json:"backoff_seconds"`
}

func FailJob(c *gin.Context) {
	var req failRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	job, err := service.Fail(c.Param("id"), req.WorkerID, req.Error, req.Retryable,
		time.Duration(req.BackoffSec)*time.Second)
	if respondServiceErr(c, err) {
		return
	}
	c.JSON(http.StatusOK, job)
}

func CancelJob(c *gin.Context) {
	job, err := service.Cancel(c.Param("id"))
	if respondServiceErr(c, err) {
		return
	}
	c.JSON(http.StatusOK, job)
}

func GetJob(c *gin.Context) {
	job, err := service.Get(c.Param("id"))
	if respondServiceErr(c, err) {
		return
	}
	c.JSON(http.StatusOK, job)
}

func ListJobs(c *gin.Context) {
	limit, _ := strconv.Atoi(c.Query("limit"))
	jobs, err := service.List(service.ListFilter{
		Status:  c.Query("status"),
		Kind:    c.Query("kind"),
		Service: c.Query("service"),
		Queue:   c.Query("queue"),
		Limit:   limit,
		Cursor:  c.Query("cursor"),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, jobs)
}

// respondServiceErr maps service-layer sentinels to HTTP status codes and
// reports whether the request was already answered.
func respondServiceErr(c *gin.Context, err error) bool {
	switch {
	case err == nil:
		return false
	case errors.Is(err, service.ErrNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
	case errors.Is(err, service.ErrNotOwned):
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	}
	return true
}

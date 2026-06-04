package api

import (
	"fmt"
	"time"

	"github.com/gaucho-racing/mapache/foreman/config"
	"github.com/gaucho-racing/mapache/foreman/pkg/logger"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func Run() {
	api := InitializeRouter()
	InitializeRoutes(api)
	err := api.Run(":" + config.Port)
	if err != nil {
		logger.SugarLogger.Fatalf("Failed to start server: %v", err)
	}
}

func InitializeRouter() *gin.Engine {
	if config.IsProduction() {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.Default()
	r.Use(cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Length", "Content-Type", "Authorization"},
		MaxAge:           12 * time.Hour,
		AllowCredentials: true,
	}))
	return r
}

func InitializeRoutes(router *gin.Engine) {
	p := config.Service.PathPrefix()
	router.GET(fmt.Sprintf("/%s/ping", p), Ping)

	// All endpoints are public for now — service-to-service auth was
	// ripped out for fast iteration. Re-introduce a middleware guard
	// (and re-add a Group + .Use(...) for the write endpoints) when
	// we want to lock this back down.
	router.GET(fmt.Sprintf("/%s/jobs", p), ListJobs)
	router.GET(fmt.Sprintf("/%s/jobs/:id", p), GetJob)
	router.GET(fmt.Sprintf("/%s/events/:id", p), StreamJobEvents)
	router.POST(fmt.Sprintf("/%s/jobs", p), EnqueueJob)
	router.POST(fmt.Sprintf("/%s/claim", p), ClaimJob)
	router.POST(fmt.Sprintf("/%s/jobs/:id/heartbeat", p), HeartbeatJob)
	router.POST(fmt.Sprintf("/%s/jobs/:id/complete", p), CompleteJob)
	router.POST(fmt.Sprintf("/%s/jobs/:id/fail", p), FailJob)
	router.POST(fmt.Sprintf("/%s/jobs/:id/cancel", p), CancelJob)
}

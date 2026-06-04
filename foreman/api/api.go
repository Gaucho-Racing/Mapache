package api

import (
	"fmt"
	"net/http"
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
		AllowHeaders:     []string{"Origin", "Content-Length", "Content-Type", "Authorization", "X-Foreman-Token"},
		MaxAge:           12 * time.Hour,
		AllowCredentials: true,
	}))
	return r
}

func InitializeRoutes(router *gin.Engine) {
	p := config.Service.PathPrefix()
	router.GET(fmt.Sprintf("/%s/ping", p), Ping)

	// Read endpoints — fronted by the gateway for the dashboard.
	router.GET(fmt.Sprintf("/%s/jobs", p), ListJobs)
	router.GET(fmt.Sprintf("/%s/jobs/:id", p), GetJob)
	router.GET(fmt.Sprintf("/%s/events/:id", p), StreamJobEvents)

	// Write endpoints — producer/worker only, guarded by the shared token.
	w := router.Group("/" + p)
	w.Use(RequireServiceToken())
	{
		w.POST("/jobs", EnqueueJob)
		w.POST("/claim", ClaimJob)
		w.POST("/jobs/:id/heartbeat", HeartbeatJob)
		w.POST("/jobs/:id/complete", CompleteJob)
		w.POST("/jobs/:id/fail", FailJob)
		w.POST("/jobs/:id/cancel", CancelJob)
	}
}

// RequireServiceToken enforces the shared internal secret on write
// endpoints. SKIP_AUTH_CHECK bypasses it for local dev; an unset secret in
// PROD is already rejected at startup (config.Verify).
func RequireServiceToken() gin.HandlerFunc {
	return func(c *gin.Context) {
		if config.SkipAuthCheck || config.InternalSecret == "" {
			c.Next()
			return
		}
		if c.GetHeader("X-Foreman-Token") != config.InternalSecret {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "invalid or missing X-Foreman-Token"})
			return
		}
		c.Next()
	}
}

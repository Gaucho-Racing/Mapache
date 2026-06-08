package api

import (
	"time"

	"github.com/gaucho-racing/mapache/live/config"
	"github.com/gaucho-racing/mapache/live/pkg/logger"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func Run() {
	api := InitializeRouter()
	InitializeRoutes(api)
	if err := api.Run(":" + config.Port); err != nil {
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
		AllowHeaders:     []string{"Origin", "Content-Length", "Content-Type", "Authorization", "Last-Event-ID"},
		MaxAge:           12 * time.Hour,
		AllowCredentials: true,
	}))
	return r
}

// streamGate bounds concurrent WS+SSE streams for this replica. Initialized
// from config in InitializeRoutes, after config.Verify has run.
var streamGate *connGate

func InitializeRoutes(router *gin.Engine) {
	streamGate = newConnGate(config.MaxConnections)
	router.GET("/live/ping", Ping)
	router.GET("/live/stats", Stats)
	router.GET("/live/ws", StreamSignalsWS)
	router.GET("/live/sse", StreamSignalsSSE)
}

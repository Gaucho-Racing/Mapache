package api

import (
	"time"

	"github.com/gaucho-racing/mapache/p987/config"
	"github.com/gaucho-racing/mapache/p987/pkg/logger"
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
		AllowHeaders:     []string{"Origin", "Content-Length", "Content-Type", "Authorization"},
		MaxAge:           12 * time.Hour,
		AllowCredentials: true,
	}))
	return r
}

func InitializeRoutes(router *gin.Engine) {
	router.GET("/p987/ping", Ping)
	router.GET("/p987/messages/:id", GetCANMessage)
	router.GET("/p987/signals/:id", GetCANBySignalID)
}

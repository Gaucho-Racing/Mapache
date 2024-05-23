package controller

import (
	"silverstone/config"

	"github.com/gin-gonic/gin"
)

func SetupRouter() *gin.Engine {
	if config.Env == "PROD" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.Default()
	return r
}

func InitializeRoutes(router *gin.Engine) {
	router.GET("/bahrain/ping", Ping)
}

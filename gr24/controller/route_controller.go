package controller

import (
	"fmt"
	"gr24/config"

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
	router.GET(fmt.Sprintf("/%s/ping", config.Service.Name), Ping)
	InitializeWebsocketRoutes(router)
}

func InitializeWebsocketRoutes(router *gin.Engine) {
	router.GET("/ws/gr24/pedal", ConnectPedalSocket)
	router.GET("/ws/gr24/mobile", ConnectMobileSocket)
}

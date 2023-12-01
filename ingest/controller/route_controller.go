package controller

import (
	"github.com/gin-gonic/gin"
)

func InitializeRoutes(router *gin.Engine) {
	router.GET("/ingest/ping", Ping)
}

func RequestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
//		utils.SugarLogger.Infoln("GATEWAY REQUEST ID: " + c.GetHeader("Request-ID"))
		c.Next()
	}
}
package controller

import (
	"github.com/gin-gonic/gin"
)

func InitializeRoutes(router *gin.Engine) {
	router.GET("/ping", Ping)
	router.GET("/ingest/ping", PingIngest)
	router.POST("/auth/register", RegisterAccount)
	router.POST("/auth/login", LoginAccount)
	router.GET("/users", GetAllUsers)
	router.GET("/users/:userID", GetUserByID)
	router.POST("/users/:userID", CreateUser)
}

func RequestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
	}
}

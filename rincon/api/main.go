package api

import (
	"encoding/base64"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"rincon/config"
	"strings"
	"time"
)

func SetupRouter() *gin.Engine {
	if config.Env == "PROD" {
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
	r.Use(AuthMiddleware())
	return r
}

func InitializeRoutes(router *gin.Engine) {
	rincon := router.Group("/rincon", func(c *gin.Context) {})
	rincon.GET("/ping", Ping)
	rincon.GET("/services", GetAllServices)
	rincon.GET("/services/:name", GetService)
	rincon.DELETE("/services/:name", RemoveService)
	rincon.GET("/services/:name/routes", GetRoutesForService)
	rincon.POST("/services", CreateService)
	rincon.GET("/routes", GetAllRoutes)
	rincon.GET("/routes/:id", GetRoute)
	rincon.POST("/routes", CreateRoute)
	rincon.GET("/match/:route", MatchRoute)
}

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method == "POST" || c.Request.Method == "PUT" || c.Request.Method == "DELETE" {
			auth := strings.SplitN(c.Request.Header.Get("Authorization"), " ", 2)
			if len(auth) != 2 || auth[0] != "Basic" {
				c.AbortWithStatusJSON(401, gin.H{"message": "Request not authorized"})
				return
			}
			payload, _ := base64.StdEncoding.DecodeString(auth[1])
			pair := strings.SplitN(string(payload), ":", 2)
			if len(pair) != 2 || pair[0] != config.AuthUser || pair[1] != config.AuthPassword {
				c.AbortWithStatusJSON(401, gin.H{"message": "Invalid credentials"})
				return
			}
		}
		c.Next()
	}
}

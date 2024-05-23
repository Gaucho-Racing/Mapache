package controller

import (
	"encoding/base64"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"kerbecs/config"
	"strings"
	"time"
)

func StartAdminServer() error {
	adminRouter := SetupAdminRouter()
	InitializeAdminRoutes(adminRouter)
	return adminRouter.Run(":" + config.AdminPort)
}

func SetupAdminRouter() *gin.Engine {
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
	r.Use(AdminAuthMiddleware())
	return r
}

func InitializeAdminRoutes(router *gin.Engine) {
	gw := router.Group("/admin-gw", func(c *gin.Context) {})
	gw.GET("/ping", Ping)
}

func AdminAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.FullPath() != "/admin-gw/ping" {
			auth := strings.SplitN(c.Request.Header.Get("Authorization"), " ", 2)
			if len(auth) != 2 || auth[0] != "Basic" {
				c.AbortWithStatusJSON(401, gin.H{"message": "Request not authorized"})
				return
			}
			payload, _ := base64.StdEncoding.DecodeString(auth[1])
			pair := strings.SplitN(string(payload), ":", 2)
			if len(pair) != 2 || pair[0] != config.AdminUser || pair[1] != config.AdminPassword {
				c.AbortWithStatusJSON(401, gin.H{"message": "Invalid credentials"})
				return
			}
		}
		c.Next()
	}
}

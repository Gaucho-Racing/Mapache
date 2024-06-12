package controller

import (
	"bahrain/config"
	"bahrain/service"
	"bahrain/utils"
	"errors"
	"fmt"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func SetupRouter() *gin.Engine {
	if config.Env == "PROD" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.Default()
	r.Use(AuthChecker())
	return r
}

func InitializeRoutes(router *gin.Engine) {
	router.GET(fmt.Sprintf("/%s/ping", config.Service.Name), Ping)
	router.POST("/auth/register", RegisterAccount)
	router.POST("/auth/login", LoginAccount)
	router.GET("/users", GetAllUsers)
	router.GET("/users/:userID", GetUserByID)
	router.POST("/users/:userID", CreateUser)
}

func AuthChecker() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.GetHeader("Authorization") != "" {
			claims, err := service.ValidateJWT(strings.Split(c.GetHeader("Authorization"), "Bearer ")[1])
			if err != nil {
				utils.SugarLogger.Errorln("Failed to validate token: " + err.Error())
				if errors.Is(err, jwt.ErrTokenExpired) {
					c.AbortWithStatusJSON(401, gin.H{"message": "Token expired"})
				}
			} else {
				utils.SugarLogger.Infoln("Decoded token: " + claims.ID + " " + claims.Email)
				c.Set("Request-UserID", claims.ID)
			}
		}
		c.Next()
	}
}

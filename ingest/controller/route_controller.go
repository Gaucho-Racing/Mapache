package controller

import (
	"errors"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	gr24controller "ingest/controller/gr24"
	"ingest/service"
	"ingest/utils"
	"strings"
)

func InitializeRoutes(router *gin.Engine) {
	router.GET("/ping", Ping)
	router.GET("/ingest/ping", PingIngest)
	router.POST("/auth/register", RegisterAccount)
	router.POST("/auth/login", LoginAccount)
	router.GET("/users", GetAllUsers)
	router.GET("/users/:userID", GetUserByID)
	router.POST("/users/:userID", CreateUser)
	router.GET("/vehicles", GetAllVehicles)
	router.GET("/vehicles/:vehicleID", GetVehicleByID)
	router.POST("/vehicles/:vehicleID", CreateVehicle)
	InitializeWebsocketRoutes(router)
}

func InitializeWebsocketRoutes(router *gin.Engine) {
	router.GET("/ws/gr24/gps", gr24controller.CreateGPSSocketConnection)
	router.GET("/ws/gr24/pedal", gr24controller.CreateGPSSocketConnection)
}

func RequestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
	}
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

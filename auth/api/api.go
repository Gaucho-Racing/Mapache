package api

import (
	"auth/config"
	"auth/service"
	"auth/utils"
	"net/http"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
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
	r.Use(AuthChecker())
	r.Use(UnauthorizedPanicHandler())
	return r
}

func InitializeRoutes(router *gin.Engine) {
	router.GET("/ping", Ping)
	router.POST("/auth/login", Login)
	router.GET("/users", GetAllUsers)
	router.GET("/users/@me", GetCurrentUser)
	router.GET("/users/:userID", GetUser)
}

func AuthChecker() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.GetHeader("Authorization") != "" {
			authHeader := c.GetHeader("Authorization")
			if strings.HasPrefix(authHeader, "Bearer ") {
				claims, err := service.ValidateJWT(strings.Split(c.GetHeader("Authorization"), "Bearer ")[1])
				if err != nil {
					utils.SugarLogger.Errorln("Failed to validate token: " + err.Error())
					c.AbortWithStatusJSON(401, gin.H{"message": err.Error()})
				} else {
					utils.SugarLogger.Infof("Decoded token: %s", claims.Subject)
					utils.SugarLogger.Infof("↳ Client ID: %s", claims.Audience[0])
					utils.SugarLogger.Infof("↳ Scope: %s", claims.Scope)
					utils.SugarLogger.Infof("↳ Issued at: %s", claims.IssuedAt.String())
					utils.SugarLogger.Infof("↳ Expires at: %s", claims.ExpiresAt.String())
					c.Set("Auth-Token", strings.Split(c.GetHeader("Authorization"), "Bearer ")[1])
					c.Set("Auth-UserID", claims.Subject)
					c.Set("Auth-Audience", claims.Audience[0])
					c.Set("Auth-Scope", claims.Scope)
				}
			}
		}
		c.Next()
	}
}

func UnauthorizedPanicHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				if err == "Unauthorized" {
					c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "you are not authorized to access this resource"})
				} else {
					// Handle other panics
					utils.SugarLogger.Errorf("Unexpected panic: %v", err)
					c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"message": err.(string)})
				}
			}
		}()
		c.Next()
	}
}

// Require checks if a condition is true, otherwise aborts the request
func Require(c *gin.Context, condition bool) {
	if !condition {
		panic("Unauthorized")
	}
}

// Any checks if any condition is true, otherwise returns false
func Any(conditions ...bool) bool {
	for _, condition := range conditions {
		if condition {
			return true
		}
	}
	return false
}

// All checks if all conditions are true, otherwise returns false
func All(conditions ...bool) bool {
	for _, condition := range conditions {
		if !condition {
			return false
		}
	}
	return true
}

func RequestUserHasID(c *gin.Context, id string) bool {
	return GetRequestUserID(c) == id
}

func RequestUserHasEmail(c *gin.Context, email string) bool {
	return GetRequestUserEmail(c) == email
}

func RequestUserHasRole(c *gin.Context, role string) bool {
	user, err := service.GetUser(GetRequestUserID(c))
	if err != nil {
		return false
	}
	return user.HasRole(role)
}

func GetRequestUserID(c *gin.Context) string {
	id, exists := c.Get("Auth-UserID")
	if !exists {
		return ""
	}
	return id.(string)
}

func GetRequestUserEmail(c *gin.Context) string {
	email, exists := c.Get("Auth-Email")
	if !exists {
		return ""
	}
	return email.(string)
}

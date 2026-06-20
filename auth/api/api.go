package api

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gaucho-racing/mapache/auth/config"
	"github.com/gaucho-racing/mapache/auth/pkg/logger"
	"github.com/gaucho-racing/mapache/auth/service"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func Run() {
	api := InitializeRouter()
	InitializeRoutes(api)
	err := api.Run(":" + config.Port)
	if err != nil {
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
	r.Use(AuthChecker())
	r.Use(UnauthorizedPanicHandler())
	return r
}

func InitializeRoutes(router *gin.Engine) {
	router.GET(fmt.Sprintf("/%s/ping", config.Service.PathPrefix()), Ping)
	router.POST("/auth/login", Login)
	router.GET("/users", GetAllUsers)
	router.GET("/users/@me", GetCurrentUser)
	router.GET("/users/:userID", GetUser)
}

func AuthChecker() gin.HandlerFunc {
	return func(c *gin.Context) {
		if config.SkipAuthCheck {
			c.Set("Auth-Token", "mock-token")
			c.Set("Auth-EntityID", "mock-entity")
			c.Set("Auth-UserID", "mock-user")
			c.Set("Auth-Audience", "mock-audience")
			c.Set("Auth-Scope", "openid profile email user:read groups:read")
			c.Next()
			return
		}
		authHeader := c.GetHeader("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			token := strings.TrimPrefix(authHeader, "Bearer ")
			claims, err := service.ValidateJWT(token)
			if err != nil {
				logger.SugarLogger.Errorln("Failed to validate token: " + err.Error())
				c.AbortWithStatusJSON(401, gin.H{"message": err.Error()})
				return
			}
			// Sentinel v5: `sub` is the entity_id (users and service
			// accounts are both entities); `user_id` is a custom claim
			// stamped only when the token represents a logged-in user.
			// Downstream user lookups key off Auth-UserID.
			logger.SugarLogger.Infof("Decoded token: entity=%s user=%s", claims.Subject, claims.UserID)
			logger.SugarLogger.Infof("↳ Client ID: %s", claims.Audience[0])
			logger.SugarLogger.Infof("↳ Scope: %s", claims.Scope)
			logger.SugarLogger.Infof("↳ Expires at: %s", claims.ExpiresAt.String())
			c.Set("Auth-Token", token)
			c.Set("Auth-EntityID", claims.Subject)
			c.Set("Auth-UserID", claims.UserID)
			c.Set("Auth-Audience", claims.Audience[0])
			c.Set("Auth-Scope", claims.Scope)
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
					logger.SugarLogger.Errorf("Unexpected panic: %v", err)
					c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"message": err.(string)})
				}
			}
		}()
		c.Next()
	}
}

func Require(c *gin.Context, condition bool) {
	if !condition {
		panic("Unauthorized")
	}
}

func Any(conditions ...bool) bool {
	for _, condition := range conditions {
		if condition {
			return true
		}
	}
	return false
}

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

// RequestUserInGroup reports whether the bearer's user is a member of
// the named Sentinel group. Looked up against Sentinel each call —
// there's no in-process cache, so don't call this in a tight loop.
func RequestUserInGroup(c *gin.Context, name string) bool {
	user, err := service.GetUser(GetRequestUserID(c))
	if err != nil {
		return false
	}
	return user.HasGroup(name)
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

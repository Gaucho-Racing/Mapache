package api

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gaucho-racing/mapache/vehicle/config"
	"github.com/gaucho-racing/mapache/vehicle/pkg/logger"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// Cap request bodies so a single oversized payload (e.g. a huge laps array on
// PUT /sessions/:id/laps) can't be read fully into memory. ShouldBindJSON
// otherwise buffers the entire body with no limit.
const maxRequestBodyBytes = 10 << 20 // 10 MiB

func MaxBodySize(max int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, max)
		c.Next()
	}
}

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
	r.Use(MaxBodySize(maxRequestBodyBytes))
	r.Use(cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Length", "Content-Type", "Authorization"},
		MaxAge:           12 * time.Hour,
		AllowCredentials: true,
	}))
	r.Use(UnauthorizedPanicHandler())
	return r
}

func InitializeRoutes(router *gin.Engine) {
	router.GET(fmt.Sprintf("/%s/ping", config.Service.PathPrefix()), Ping)
	router.GET("/vehicles", GetAllVehicles)
	router.GET("/vehicles/:vehicleID", GetVehicleByID)
	router.POST("/vehicles/:vehicleID", CreateVehicle)
	router.DELETE("/vehicles/:vehicleID", DeleteVehicle)
	router.GET("/sessions", GetAllSessions)
	router.GET("/sessions/:sessionID", GetSessionByID)
	router.GET("/sessions/ongoing", GetAllOngoingSessions)
	router.POST("/sessions/:sessionID", CreateSession)
	router.POST("/sessions/:sessionID/analysis", SaveSessionAnalysis)
	router.POST("/sessions/new", NewSession)
	router.DELETE("/sessions/:sessionID", DeleteSession)
	router.POST("/sessions/:sessionID/markers", CreateMarker)
	router.DELETE("/sessions/:sessionID/markers/:markerID", DeleteMarker)
	router.GET("/sessions/:sessionID/laps", GetLapsForSession)
	router.PUT("/sessions/:sessionID/laps", ReplaceLapsForSession)

	// Dashboards: user-curated grids of widgets driven by the MQL query
	// language. Widget endpoints are nested under their dashboard so the
	// react-grid-layout drag/resize PUT can hit a stable path per widget.
	router.GET("/dashboards", GetAllDashboards)
	router.POST("/dashboards", CreateDashboard)
	router.GET("/dashboards/:dashboardID", GetDashboardByID)
	router.PUT("/dashboards/:dashboardID", UpdateDashboard)
	router.DELETE("/dashboards/:dashboardID", DeleteDashboard)
	router.POST("/dashboards/:dashboardID/widgets", CreateWidget)
	router.PUT("/dashboards/:dashboardID/widgets/:widgetID", UpdateWidget)
	router.DELETE("/dashboards/:dashboardID/widgets/:widgetID", DeleteWidget)

	router.GET("/vehicle-types", GetVehicleTypes)

	// Config flag definitions (per vehicle type).
	router.GET("/config/flags", GetAllConfigFlags)
	router.POST("/config/flags", UpsertConfigFlag)
	router.DELETE("/config/flags/:vehicleType/:key", DeleteConfigFlag)

	// Per-vehicle config: snapshot (car poll), status, and overrides.
	router.GET("/vehicles/:vehicleID/config", GetVehicleConfig)
	router.GET("/vehicles/:vehicleID/config/status", GetVehicleConfigStatus)
	router.GET("/vehicles/:vehicleID/config/overrides", GetVehicleConfigOverrides)
	router.PUT("/vehicles/:vehicleID/config/overrides/:key", SetVehicleConfigOverride)
	router.DELETE("/vehicles/:vehicleID/config/overrides/:key", ClearVehicleConfigOverride)
}

func UnauthorizedPanicHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				if err == "Unauthorized" {
					c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "you are not authorized to access this resource"})
				} else {
					// Handle other panics
					logger.SugarLogger.Errorf("Unexpected panic: %v", err)
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

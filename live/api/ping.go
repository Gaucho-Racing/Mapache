package api

import (
	"net/http"

	"github.com/gaucho-racing/mapache/live/config"
	"github.com/gaucho-racing/mapache/live/service"
	"github.com/gin-gonic/gin"
)

func Ping(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": config.Service.FormattedNameWithVersion() + " is online!"})
}

// Stats returns subscription + cache counts for quick observability.
// Cheap enough to call inline — no caching needed.
func Stats(c *gin.Context) {
	vehicles, exact, patterns := service.Signals.Stats()
	c.JSON(http.StatusOK, gin.H{
		"vehicles":            vehicles,
		"exact_subscriptions": exact,
		"pattern_subscriptions": patterns,
		"cache_window_sec":    config.CacheWindowSec,
	})
}

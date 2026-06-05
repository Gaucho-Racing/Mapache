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

// Stats returns subscription, cache, and ingest-latency snapshots for
// quick observability. Cheap enough to call inline — no caching needed.
func Stats(c *gin.Context) {
	subVehicles, exact, patterns := service.Signals.Stats()
	c.JSON(http.StatusOK, gin.H{
		"subscriptions": gin.H{
			"vehicles": subVehicles,
			"exact":    exact,
			"patterns": patterns,
		},
		"cache":   service.Recent.Stats(),
		"latency": service.Latency.Stats(),
	})
}

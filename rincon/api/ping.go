package api

import (
	"github.com/gin-gonic/gin"
	"rincon/config"
	"rincon/service"
)

func Ping(c *gin.Context) {
	c.JSON(200, gin.H{
		"message":  "Rincon v" + config.Version + " is online!",
		"services": service.GetNumUniqueServices(),
		"routes":   service.GetNumRoutes(),
	})
}

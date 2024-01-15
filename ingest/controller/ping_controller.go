package controller

import (
	"github.com/gin-gonic/gin"
	"ingest/config"
	"ingest/service"
	"net/http"
)

func Ping(c *gin.Context) {
	c.JSON(http.StatusOK, service.Ping())
}

func PingIngest(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "Mapache Ingest v" + config.Version + " is online!"})
}

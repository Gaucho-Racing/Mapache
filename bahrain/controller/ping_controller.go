package controller

import (
	"bahrain/config"
	"github.com/gin-gonic/gin"
	"net/http"
)

func Ping(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "Mapache Bahrain v" + config.Version + " is online!"})
}

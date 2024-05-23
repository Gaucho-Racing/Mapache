package controller

import (
	"github.com/gin-gonic/gin"
	"kerbecs/config"
)

func Ping(c *gin.Context) {
	c.JSON(200, gin.H{
		"message": "Kerbecs v" + config.Version + " is online!",
	})
}

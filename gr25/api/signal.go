package api

import (
	"strings"

	"github.com/gin-gonic/gin"
)

func GetLatestSignalWebSocket(c *gin.Context) {
	// id will give a comma separated list of signals
	signals := strings.Split(c.Query("id"), ",")

}

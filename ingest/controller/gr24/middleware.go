package gr24controller

import (
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"ingest/service"
	"net/http"
	"strings"
)

var SocketUpgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if strings.HasPrefix(c.FullPath(), "/gr24/") && service.GetRequestUserID(c) == "" {
			c.JSON(http.StatusForbidden, gin.H{"message": "You are not authorized to access this resource"})
			c.Abort()
			return
		}
		c.Next()
	}
}

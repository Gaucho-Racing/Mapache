package api

import (
	"gr25/service"
	"gr25/utils"
	"net/http"
	"slices"
	"strconv"
	"strings"

	"github.com/gaucho-racing/mapache-go"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func GetLatestSignalWebSocket(c *gin.Context) {
	vehicleID := c.Query("vehicle_id")
	signals := strings.Split(c.Query("signals"), ",")

	if vehicleID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "vehicle_id is required"})
		return
	}

	if len(signals) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "signals are required"})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	service.SubscribeSignals(func(signal mapache.Signal) {
		if signal.VehicleID == vehicleID && slices.Contains(signals, signal.Name) {
			conn.WriteJSON(signal)
		}
	})

	for {
		messageType, p, err := conn.ReadMessage()
		if err != nil {
			utils.SugarLogger.Errorln("[WS - gr25/live] error while reading message\n", err.Error())
			c.AbortWithError(http.StatusInternalServerError, err)
			break
		}
		utils.SugarLogger.Infoln("[WS - gr25/live] Received message ("+strconv.Itoa(messageType)+"): ", string(p))
	}
}

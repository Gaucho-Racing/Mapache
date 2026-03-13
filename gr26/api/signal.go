package api

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gaucho-racing/mapache/gr26/pkg/logger"
	"github.com/gaucho-racing/mapache/gr26/service"

	mapache "github.com/gaucho-racing/mapache/mapache-go/v3"
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

	client := &service.Client{
		Conn: conn,
		Send: make(chan mapache.Signal, 64),
	}

	service.Hub.Subscribe(vehicleID, signals, client)

	go func() {
		defer close(client.Send)
		defer service.Hub.Unsubscribe(vehicleID, signals, client)
		for {
			messageType, p, err := conn.ReadMessage()
			if err != nil {
				logger.SugarLogger.Errorln("[WS - gr26/live] error while reading message\n", err.Error())
				return
			}
			logger.SugarLogger.Infoln("[WS - gr26/live] Received message ("+strconv.Itoa(messageType)+"): ", string(p))
		}
	}()

	for signal := range client.Send {
		if err := conn.WriteJSON(signal); err != nil {
			break
		}
	}
}

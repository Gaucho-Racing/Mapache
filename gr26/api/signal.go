package api

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gaucho-racing/mapache/gr26/model"
	"github.com/gaucho-racing/mapache/gr26/pkg/logger"
	"github.com/gaucho-racing/mapache/gr26/service"

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

	rate := 0
	if r := c.Query("rate"); r != "" {
		if v, err := strconv.Atoi(r); err == nil && v > 0 {
			rate = v
		}
	}

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
		Send: make(chan model.SignalEvent, 64),
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

	if rate <= 0 {
		for signal := range client.Send {
			if err := conn.WriteJSON(signal); err != nil {
				break
			}
		}
		return
	}

	// Client opted into a max refresh rate: coalesce per signal name and only
	// emit the latest value per name on each tick.
	ticker := time.NewTicker(time.Second / time.Duration(rate))
	defer ticker.Stop()
	pending := make(map[string]model.SignalEvent)
	for {
		select {
		case sig, ok := <-client.Send:
			if !ok {
				for _, s := range pending {
					_ = conn.WriteJSON(s)
				}
				return
			}
			pending[sig.Name] = sig
		case <-ticker.C:
			if len(pending) == 0 {
				continue
			}
			for _, s := range pending {
				if err := conn.WriteJSON(s); err != nil {
					return
				}
			}
			pending = make(map[string]model.SignalEvent)
		}
	}
}

package controller

import (
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"ingest/model"
	"ingest/service"
	"ingest/utils"
	"net/http"
	"strconv"
)

var gpsUpgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func GR24GpsSocket(c *gin.Context) {
	conn, err := gpsUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		utils.SugarLogger.Errorln("[WS - gr24/gps] error while Upgrading websocket connection\n", err.Error())
		c.AbortWithError(http.StatusInternalServerError, err)
		return
	}
	defer conn.Close()
	service.GR24GpsSubscribe(func(pedal model.GR24Gps) {
		_ = conn.WriteJSON(pedal)
	})

	for {
		messageType, p, err := conn.ReadMessage()
		if err != nil {
			utils.SugarLogger.Errorln("[WS - gr24/gps] error while reading message\n", err.Error())
			c.AbortWithError(http.StatusInternalServerError, err)
			break
		}
		utils.SugarLogger.Infoln("[WS - gr24/gps] Received message ("+strconv.Itoa(messageType)+"): ", string(p))
	}
}

package controller

import (
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"ingest/model/gr24"
	"ingest/service/gr24"
	"ingest/utils"
	"net/http"
	"strconv"
)

var pedalUpgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func GR24PedalSocket(c *gin.Context) {
	conn, err := pedalUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		utils.SugarLogger.Errorln("[WS - gr24/pedal] error while Upgrading websocket connection\n", err.Error())
		c.AbortWithError(http.StatusInternalServerError, err)
		return
	}
	defer conn.Close()
	gr24service.GR24PedalSubscribe(func(pedal gr24model.GR24Pedal) {
		_ = conn.WriteJSON(pedal)
	})

	for {
		messageType, p, err := conn.ReadMessage()
		if err != nil {
			utils.SugarLogger.Errorln("[WS - gr24/pedal] error while reading message\n", err.Error())
			c.AbortWithError(http.StatusInternalServerError, err)
			break
		}
		utils.SugarLogger.Infoln("[WS - gr24/pedal] Received message ("+strconv.Itoa(messageType)+"): ", string(p))
	}
}

func GR24GetAllPedals(c *gin.Context) {

}

package gr24controller

import (
	"github.com/gin-gonic/gin"
	gr24model "ingest/model/gr24"
	gr24service "ingest/service/gr24"
	"ingest/utils"
	"net/http"
	"strconv"
)

func CreateGPSSocketConnection(c *gin.Context) {
	conn, err := SocketUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		utils.SugarLogger.Errorln("[WS - gr24/gps] error while upgrading websocket connection\n", err.Error())
		c.AbortWithError(http.StatusInternalServerError, err)
		return
	}
	defer conn.Close()
	gr24service.GPSSubscribe(func(pedal gr24model.GPS) {
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

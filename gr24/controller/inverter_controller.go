package controller

import (
	"gr24/model"
	"gr24/service"
	"gr24/utils"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func ConnectInverterSocket(c *gin.Context) {
	conn, err := SocketUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		utils.SugarLogger.Errorln("[WS - gr24/inverter] error while Upgrading websocket connection\n", err.Error())
		c.AbortWithError(http.StatusInternalServerError, err)
		return
	}
	defer conn.Close()
	service.SubscribeInverter(func(inverter model.Inverter) {
		_ = conn.WriteJSON(inverter)
	})

	for {
		messageType, p, err := conn.ReadMessage()
		if err != nil {
			utils.SugarLogger.Errorln("[WS - gr24/inverter] error while reading message\n", err.Error())
			c.AbortWithError(http.StatusInternalServerError, err)
			break
		}
		utils.SugarLogger.Infoln("[WS - gr24/inverter] Received message ("+strconv.Itoa(messageType)+"): ", string(p))
	}
}

package controller

import (
	"gr24/model"
	"gr24/service"
	"gr24/utils"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func ConnectBCMSocket(c *gin.Context) {
	conn, err := SocketUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		utils.SugarLogger.Errorln("[WS - gr24/bcm] error while Upgrading websocket connection\n", err.Error())
		c.AbortWithError(http.StatusInternalServerError, err)
		return
	}
	defer conn.Close()
	service.SubscribeBCM(func(bcm model.BCM) {
		_ = conn.WriteJSON(bcm)
	})

	for {
		messageType, p, err := conn.ReadMessage()
		if err != nil {
			utils.SugarLogger.Errorln("[WS - gr24/bcm] error while reading message\n", err.Error())
			c.AbortWithError(http.StatusInternalServerError, err)
			break
		}
		utils.SugarLogger.Infoln("[WS - gr24/bcm] Received message ("+strconv.Itoa(messageType)+"): ", string(p))
	}
}

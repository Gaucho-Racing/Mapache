package controller

import (
	"gr24/model"
	"gr24/service"
	"gr24/utils"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func ConnectWheelSocket(c *gin.Context) {
	conn, err := SocketUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		utils.SugarLogger.Errorln("[WS - gr24/wheel] error while Upgrading websocket connection\n", err.Error())
		c.AbortWithError(http.StatusInternalServerError, err)
		return
	}
	defer conn.Close()
	service.SubscribeWheel(func(wheel model.Wheel) {
		_ = conn.WriteJSON(wheel)
	})

	for {
		messageType, p, err := conn.ReadMessage()
		if err != nil {
			utils.SugarLogger.Errorln("[WS - gr24/wheel] error while reading message\n", err.Error())
			c.AbortWithError(http.StatusInternalServerError, err)
			break
		}
		utils.SugarLogger.Infoln("[WS - gr24/wheel] Received message ("+strconv.Itoa(messageType)+"): ", string(p))
	}
}

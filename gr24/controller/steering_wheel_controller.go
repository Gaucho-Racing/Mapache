package controller

import (
	"gr24/model"
	"gr24/service"
	"gr24/utils"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func ConnectSteeringWheelSocket(c *gin.Context) {
	conn, err := SocketUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		utils.SugarLogger.Errorln("[WS - gr24/steering_wheel] error while Upgrading websocket connection\n", err.Error())
		c.AbortWithError(http.StatusInternalServerError, err)
		return
	}
	defer conn.Close()
	service.SubscribeSteeringWheel(func(steeringWheel model.SteeringWheel) {
		_ = conn.WriteJSON(steeringWheel)
	})

	for {
		messageType, p, err := conn.ReadMessage()
		if err != nil {
			utils.SugarLogger.Errorln("[WS - gr24/steering_wheel] error while reading message\n", err.Error())
			c.AbortWithError(http.StatusInternalServerError, err)
			break
		}
		utils.SugarLogger.Infoln("[WS - gr24/steering_wheel] Received message ("+strconv.Itoa(messageType)+"): ", string(p))
	}
}

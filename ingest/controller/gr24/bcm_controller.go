package gr24controller

import (
	"github.com/gin-gonic/gin"
	gr24model "ingest/model/gr24"
	gr24service "ingest/service/gr24"
	"ingest/utils"
	"net/http"
	"strconv"
)

func ConnectBCMSocket(c *gin.Context) {
	conn, err := SocketUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		utils.SugarLogger.Errorln("[WS - gr24/bcm] error while upgrading websocket connection\n", err.Error())
		c.AbortWithError(http.StatusInternalServerError, err)
		return
	}
	defer conn.Close()
	gr24service.BCMSubscribe(func(pedal gr24model.BCM) {
		_ = conn.WriteJSON(pedal)
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

func GR24GetAllBCMs(c *gin.Context) {
	c.JSON(http.StatusOK, gr24service.GetAllBCMs())
}

func GR24GetBCMByID(c *gin.Context) {
	bcm := gr24service.GetBCMByID(c.Param("id"))
	if bcm.ID == "" {
		c.JSON(http.StatusNotFound, gin.H{"message": "No node found with given id: " + c.Param("id")})
	} else {
		c.JSON(http.StatusOK, bcm)
	}
}

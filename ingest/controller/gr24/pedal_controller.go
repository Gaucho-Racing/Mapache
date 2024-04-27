package gr24controller

import (
	"github.com/gin-gonic/gin"
	gr24model "ingest/model/gr24"
	"ingest/service"
	gr24service "ingest/service/gr24"
	"ingest/utils"
	"net/http"
	"strconv"
)

func ConnectPedalSocket(c *gin.Context) {
	conn, err := SocketUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		utils.SugarLogger.Errorln("[WS - gr24/pedal] error while Upgrading websocket connection\n", err.Error())
		c.AbortWithError(http.StatusInternalServerError, err)
		return
	}
	defer conn.Close()
	gr24service.PedalSubscribe(func(pedal gr24model.Pedal) {
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

func GetAllPedals(c *gin.Context) {
	c.JSON(http.StatusOK, gr24service.GetAllPedals())
}

func GetPedalByID(c *gin.Context) {
	pedal := gr24service.GetPedalByID(c.Param("id"))
	if pedal.ID == "" {
		c.JSON(http.StatusNotFound, gin.H{"message": "No node found with given id: " + c.Param("id")})
	} else {
		c.JSON(http.StatusOK, pedal)
	}
}

func GetAllPedalsForTripID(c *gin.Context) {
	trip := service.GetTripByID(c.Param("tripID"))
	if trip.ID == "" {
		c.JSON(http.StatusNotFound, gin.H{"message": "No trip found with given id: " + c.Param("tripID")})
		return
	}
	vehicle := service.GetVehicleByID(trip.VehicleID)
	if vehicle.ID != "gr24" {
		c.JSON(http.StatusNotFound, gin.H{"message": "Given trip not for gr24 but for vehicle: " + trip.VehicleID})
		return
	}
	c.JSON(http.StatusOK, gr24service.GetAllPedalsForTrip(trip))
}

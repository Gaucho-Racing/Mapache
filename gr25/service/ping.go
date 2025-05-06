package service

import (
	"encoding/binary"
	"fmt"
	"gr25/database"
	"gr25/mqtt"
	"gr25/utils"
	"strings"
	"time"

	"github.com/gaucho-racing/mapache-go"
)

func HandlePing(vehicleID string, nodeID string, payload []byte) {
	utils.SugarLogger.Infof("[MQ] Received ping from gr25/%s/%s", vehicleID, nodeID)
	ping := int(binary.BigEndian.Uint64(payload[:8]))
	uploadKey := binary.BigEndian.Uint16(payload[8:10])
	// TODO: Check upload key
	if uploadKey == 0 {
		utils.SugarLogger.Infof("Received invalid upload key: %x, ignoring", uploadKey)
		return
	}
	go SendPong(vehicleID, nodeID, ping)
}

func SendPong(vehicleID string, nodeID string, ping int) {
	topic := fmt.Sprintf("gr25/%s/%s/pong", vehicleID, nodeID)
	pong := int(time.Now().UnixMilli())
	latency := pong - ping

	payload := make([]byte, 16)
	binary.BigEndian.PutUint64(payload, uint64(ping))
	binary.BigEndian.PutUint64(payload[8:], uint64(pong))

	mqtt.Client.Publish(topic, 0, false, payload)
	utils.SugarLogger.Infof("[PING] Received ping from gr25/%s/%s in %dms", vehicleID, nodeID, latency)

	err := CreatePing(mapache.Ping{
		VehicleID: vehicleID,
		Ping:      ping,
		Pong:      pong,
		Latency:   latency,
	})
	if err != nil {
		utils.SugarLogger.Infof("Error creating ping: %s", err)
	}
}

func GetPing(vehicleID string, millis int) mapache.Ping {
	var ping mapache.Ping
	database.DB.Where("vehicle_id = ? AND ping = ?", vehicleID, millis).First(&ping)
	return ping
}

func CreatePing(ping mapache.Ping) error {
	result := database.DB.Create(&ping)
	if result.Error != nil {
		if strings.Contains(result.Error.Error(), "Duplicate entry") {
			println("Duplicate entry")
			result = database.DB.Where("vehicle_id = ? AND ping = ?", ping.VehicleID, ping.Ping).Updates(&ping)
		}
	} else {
		utils.SugarLogger.Infow("[DB] New ping created",
			"vehicle_id", ping.VehicleID,
			"ping", ping.Ping,
			"pong", ping.Pong,
			"latency", ping.Latency,
		)
	}
	return result.Error
}

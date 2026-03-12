package service

import (
	"encoding/binary"
	"fmt"
	"strings"
	"time"

	"github.com/gaucho-racing/mapache/gr26/database"
	"github.com/gaucho-racing/mapache/gr26/mqtt"
	"github.com/gaucho-racing/mapache/gr26/pkg/logger"

	"github.com/gaucho-racing/mapache/mapache-go"
)

func HandlePing(vehicleID string, nodeID string, payload []byte) {
	logger.SugarLogger.Infof("[MQ] Received ping from gr26/%s/%s", vehicleID, nodeID)
	ping := binary.BigEndian.Uint64(payload[:8])
	uploadKey := binary.BigEndian.Uint16(payload[8:10])
	if !ValidateUploadKey(vehicleID, int(uploadKey)) {
		logger.SugarLogger.Infof("Upload key validation failed for vehicle %s, ignoring", vehicleID)
		return
	}
	go SendPong(vehicleID, nodeID, ping)
}

func SendPong(vehicleID string, nodeID string, ping uint64) {
	topic := fmt.Sprintf("gr26/%s/%s/pong", vehicleID, nodeID)
	pong := uint64(time.Now().UnixMicro())
	latency := pong - ping

	payload := make([]byte, 16)
	binary.BigEndian.PutUint64(payload, ping)
	binary.BigEndian.PutUint64(payload[8:], pong)

	mqtt.Client.Publish(topic, 0, false, payload)
	logger.SugarLogger.Infof("[PING] Received ping from gr26/%s/%s in %dms", vehicleID, nodeID, latency/1000)

	err := CreatePing(mapache.Ping{
		VehicleID: vehicleID,
		Ping:      int(ping),
		Pong:      int(pong),
		Latency:   int(latency),
	})
	if err != nil {
		logger.SugarLogger.Infof("Error creating ping: %s", err)
	}
}

func GetPing(vehicleID string, micros int) mapache.Ping {
	var ping mapache.Ping
	database.DB.Where("vehicle_id = ? AND ping = ?", vehicleID, micros).First(&ping)
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
		logger.SugarLogger.Infow("[DB] New ping created",
			"vehicle_id", ping.VehicleID,
			"ping", ping.Ping,
			"pong", ping.Pong,
			"latency", ping.Latency,
		)
	}
	return result.Error
}

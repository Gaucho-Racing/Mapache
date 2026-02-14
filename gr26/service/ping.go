package service

import (
	"encoding/binary"
	"fmt"
	"gr26/database"
	"gr26/mqtt"
	"gr26/utils"
	"time"

	"github.com/gaucho-racing/mapache-go"
)

var pingBatch *database.BatchInserter[mapache.Ping]

func InitPingBatch() {
	pingBatch = database.NewBatchInserter[mapache.Ping]("pings", 5000, 1*time.Second)
}

func StopPingBatch() {
	pingBatch.Stop()
}

func HandlePing(vehicleID string, nodeID string, payload []byte) {
	utils.SugarLogger.Infof("[MQ] Received ping from gr26/%s/%s", vehicleID, nodeID)
	ping := binary.BigEndian.Uint64(payload[:8])
	uploadKey := binary.BigEndian.Uint16(payload[8:10])
	// TODO: Check upload key
	if uploadKey == 0 {
		utils.SugarLogger.Infof("Received invalid upload key: %x, ignoring", uploadKey)
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
	utils.SugarLogger.Infof("[PING] Received ping from gr26/%s/%s in %dms", vehicleID, nodeID, latency/1000)

	err := CreatePing(mapache.Ping{
		VehicleID: vehicleID,
		Ping:      int(ping),
		Pong:      int(pong),
		Latency:   int(latency),
	})
	if err != nil {
		utils.SugarLogger.Infof("Error creating ping: %s", err)
	}
}

func GetPing(vehicleID string, micros int) mapache.Ping {
	var ping mapache.Ping
	database.DB.Where("vehicle_id = ? AND ping = ?", vehicleID, micros).First(&ping)
	return ping
}

func CreatePing(ping mapache.Ping) error {
	pingBatch.Add(ping)
	return nil
}

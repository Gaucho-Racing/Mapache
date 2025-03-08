package service

import (
	"encoding/binary"
	"fmt"
	"gr25/mqtt"
	"gr25/utils"
	"time"
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

	println(ping, pong, latency)

	payload := make([]byte, 16)
	binary.BigEndian.PutUint64(payload, uint64(ping))
	binary.BigEndian.PutUint64(payload[8:], uint64(pong))

	mqtt.Client.Publish(topic, 0, false, payload)
	utils.SugarLogger.Infof("[PING] Received ping from gr25/%s/%s in %dms", vehicleID, nodeID, latency)
}

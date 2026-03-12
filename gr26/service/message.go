package service

import (
	"encoding/binary"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/gaucho-racing/mapache/gr26/model"
	"github.com/gaucho-racing/mapache/gr26/mqtt"
	"github.com/gaucho-racing/mapache/gr26/pkg/logger"

	mq "github.com/eclipse/paho.mqtt.golang"
)

func SubscribeTopics() {
	mqtt.Client.Subscribe("gr26/#", 0, func(client mq.Client, msg mq.Message) {
		topic := msg.Topic()
		if len(strings.Split(topic, "/")) != 4 {
			logger.SugarLogger.Infof("[MQ] Received invalid topic: %s, ignoring", topic)
			return
		}
		vehicleID := strings.Split(topic, "/")[1]
		nodeID := strings.Split(topic, "/")[2]
		canID := strings.Split(topic, "/")[3]

		if vehicleID == "" {
			logger.SugarLogger.Infof("[MQ] Received invalid vehicle id: %s, ignoring", topic)
			return
		}
		if nodeID == "" {
			logger.SugarLogger.Infof("[MQ] Received invalid node id: %s, ignoring", topic)
			return
		}

		if canID == "ping" {
			go HandlePing(vehicleID, nodeID, msg.Payload())
			return
		} else if canID == "pong" {
			return
		}

		message := msg.Payload()
		canID = strings.TrimPrefix(canID, "0x")
		canIDInt, err := strconv.ParseInt(canID, 16, 64)
		if err != nil {
			logger.SugarLogger.Infof("[MQ] Received invalid can id: %s, ignoring", canID)
			return
		}
		logger.SugarLogger.Infof("[MQ] Received message: %s", topic)
		go HandleMessage(vehicleID, nodeID, int(canIDInt), message)
	})
}

func HandleMessage(vehicleID string, nodeID string, canID int, message []byte) {
	if len(message) < 11 {
		logger.SugarLogger.Infof("[MQ] Message too short, ignoring %d bytes", len(message))
		return
	}
	timestamp := message[:8]
	uploadKey := message[8:10]
	data := message[10:]

	if !ValidateUploadKey(vehicleID, int(binary.BigEndian.Uint16(uploadKey))) {
		logger.SugarLogger.Infof("Upload key validation failed for vehicle %s, ignoring", vehicleID)
		return
	}

	messageStruct := model.GetMessage(canID)
	if messageStruct == nil {
		logger.SugarLogger.Infof("Received unknown message id: %d, ignoring", canID)
		return
	}

	err := messageStruct.FillFromBytes(data)
	if err != nil {
		logger.SugarLogger.Infof("Error deserializing message: %s", err)
		return
	}

	signals := messageStruct.ExportSignals()
	ts := int(binary.BigEndian.Uint64(timestamp))
	now := time.Now().Truncate(time.Microsecond)
	for i := range signals {
		signals[i].Name = fmt.Sprintf("%s_%s", nodeID, signals[i].Name)
		signals[i].Timestamp = ts
		signals[i].VehicleID = vehicleID
		signals[i].ProducedAt = time.UnixMicro(int64(ts))
		signals[i].CreatedAt = now
	}
	if err := CreateSignals(signals); err != nil {
		logger.SugarLogger.Infof("Error creating signals: %s", err)
	}
}

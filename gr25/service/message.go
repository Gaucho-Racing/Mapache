package service

import (
	"encoding/binary"
	"fmt"
	"gr25/model"
	"gr25/mqtt"
	"gr25/utils"
	"strconv"
	"strings"
	"time"

	mq "github.com/eclipse/paho.mqtt.golang"
)

func SubscribeTopics() {
	mqtt.Client.Subscribe("gr25/#", 0, func(client mq.Client, msg mq.Message) {
		topic := msg.Topic()
		if len(strings.Split(topic, "/")) != 4 {
			utils.SugarLogger.Infof("[MQ] Received invalid topic: %s, ignoring", topic)
			return
		}
		vehicleID := strings.Split(topic, "/")[1]
		nodeID := strings.Split(topic, "/")[2]
		canID := strings.Split(topic, "/")[3]

		if vehicleID == "" {
			utils.SugarLogger.Infof("[MQ] Received invalid vehicle id: %s, ignoring", topic)
			return
		}
		if nodeID == "" {
			utils.SugarLogger.Infof("[MQ] Received invalid node id: %s, ignoring", topic)
			return
		}

		if canID == "ping" {
			go HandlePing(vehicleID, nodeID, msg.Payload())
			return
		} else if canID == "pong" {
			// ignore loopback pong messages
			return
		}

		message := msg.Payload()
		canID = strings.TrimPrefix(canID, "0x")
		canIDInt, err := strconv.ParseInt(canID, 16, 64)
		if err != nil {
			utils.SugarLogger.Infof("[MQ] Received invalid can id: %s, ignoring", canID)
			return
		}
		utils.SugarLogger.Infof("[MQ] Received message: %s", topic)
		go HandleMessage(vehicleID, nodeID, int(canIDInt), message)
	})
}

func HandleMessage(vehicleID string, nodeID string, canID int, message []byte) {
	// First 8 bytes are timestamp
	if len(message) < 11 { // Need at least timestamp (8) + upload key (2) + at least 1 byte of data
		utils.SugarLogger.Infof("[MQ] Message too short, ignoring %d bytes", len(message))
		return
	}
	timestamp := message[:8]
	uploadKey := message[8:10]
	data := message[10:]

	// TODO: Check upload key
	if int(binary.BigEndian.Uint16(uploadKey)) == 0 {
		utils.SugarLogger.Infof("Received invalid upload key: %x, ignoring", uploadKey)
		return
	}

	messageStruct := model.GetMessage(canID)
	if messageStruct == nil {
		utils.SugarLogger.Infof("Received unknown message id: %d, ignoring", canID)
		return
	}

	err := messageStruct.FillFromBytes(data)
	if err != nil {
		utils.SugarLogger.Infof("Error deserializing message: %s", err)
		return
	}

	signals := messageStruct.ExportSignals()
	for _, signal := range signals {
		signal.Name = fmt.Sprintf("%s_%s", nodeID, signal.Name)
		signal.Timestamp = int(binary.BigEndian.Uint64(timestamp))
		signal.VehicleID = vehicleID
		signal.ProducedAt = time.UnixMicro(int64(signal.Timestamp))
		signal.CreatedAt = utils.WithPrecision(time.Now())

		err := CreateSignal(signal)
		if err != nil {
			utils.SugarLogger.Infof("Error creating signal: %s", err)
		}
	}
}

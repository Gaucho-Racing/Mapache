package service

import (
	"encoding/binary"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/gaucho-racing/mapache/gr26/model"
	"github.com/gaucho-racing/mapache/gr26/mqtt"
	"github.com/gaucho-racing/mapache/gr26/pkg/logger"

	mapache "github.com/gaucho-racing/mapache/mapache-go/v3"

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

	uploadKeyInt := int(binary.BigEndian.Uint16(uploadKey))
	if !ValidateUploadKey(vehicleID, uploadKeyInt) {
		logger.SugarLogger.Infof("Upload key validation failed for vehicle %s, ignoring", vehicleID)
		return
	}

	ts := int(binary.BigEndian.Uint64(timestamp))
	producedAt := time.UnixMicro(int64(ts))

	// Attempt to decode first. If anything goes wrong, capture why in
	// metadata so a "what bytes did we get that we couldn't parse" view
	// has the answer alongside the raw frame.
	var (
		signals []mapache.Signal
		meta    []byte
	)
	messageStruct := model.GetMessage(canID)
	switch {
	case messageStruct == nil:
		logger.SugarLogger.Infof("Received unknown message id: %d, frame stored without signals", canID)
		meta = mustJSON(map[string]any{"status": "unknown_can_id"})
	default:
		if err := messageStruct.FillFromBytes(data); err != nil {
			logger.SugarLogger.Infof("Error deserializing message id %d, frame stored without signals: %s", canID, err)
			meta = mustJSON(map[string]any{"status": "decode_error", "error": err.Error()})
		} else {
			signals = messageStruct.ExportSignals()
		}
	}

	can, err := CreateCAN(model.CAN{
		VehicleID:  vehicleID,
		NodeID:     nodeID,
		Timestamp:  ts,
		CANID:      canID,
		Bytes:      data,
		UploadKey:  uploadKeyInt,
		Metadata:   meta,
		ProducedAt: producedAt,
	})
	if err != nil {
		logger.SugarLogger.Infof("Error creating CAN record: %s", err)
		return
	}

	if len(signals) == 0 {
		return
	}
	now := time.Now().Truncate(time.Microsecond)
	for i := range signals {
		signals[i].Name = fmt.Sprintf("%s_%s", nodeID, signals[i].Name)
		signals[i].Timestamp = ts
		signals[i].VehicleID = vehicleID
		signals[i].ProducedAt = producedAt
		signals[i].CreatedAt = now
	}
	if err := CreateSignals(signals); err != nil {
		logger.SugarLogger.Infof("Error creating signals: %s", err)
		return
	}

	signalIDs := make([]string, len(signals))
	for i, s := range signals {
		signalIDs[i] = s.ID
	}
	if err := CreateCANSignals(can.ID, signalIDs); err != nil {
		logger.SugarLogger.Infof("Error creating CAN-signal links: %s", err)
	}
}

func mustJSON(v any) []byte {
	b, err := json.Marshal(v)
	if err != nil {
		// json.Marshal on a map of strings/strings can't fail in practice;
		// fall back to a literal so callers always get a valid jsonb value.
		return []byte(`{"status":"marshal_error"}`)
	}
	return b
}

package service

import (
	"encoding/binary"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/gaucho-racing/mapache/gr26/config"
	"github.com/gaucho-racing/mapache/gr26/model"
	"github.com/gaucho-racing/mapache/gr26/mqtt"
	"github.com/gaucho-racing/mapache/gr26/pkg/logger"

	mapache "github.com/gaucho-racing/mapache/mapache-go/v3"

	mq "github.com/eclipse/paho.mqtt.golang"
)

// ShelterBatchHook fires at the tail of HandleMessage when a frame's
// canID matches model.MsgIDShelterBatch. Wired up in main.go to the
// job package — left as a nil-able package var here so service stays
// importable without job (avoids the circular import; service is the
// lower layer).
var ShelterBatchHook func(vehicleID string, ts int, data []byte)

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

// ProcessFrame decodes a single CAN frame and returns the assembled
// gr26_can record + the list of signals it produced, ready for the
// caller to persist however it wants. Pure data transformation — no
// DB writes, no WS publish, no side-channel hooks.
//
// The returned CAN's UploadKey is left at 0; the live MQTT path fills
// it in from the envelope, the cold-storage replay path leaves it.
// Signals are stamped with the node-prefixed Name and the per-frame
// metadata (Timestamp, VehicleID, ProducedAt, CreatedAt) so the caller
// can pass them straight to CreateSignals.
//
// On unknown canID or a decode_error, the CAN comes back with its
// Metadata field set to a {status, note} blob and signals is empty —
// callers still want to persist the raw frame so "what bytes did we
// fail to parse" stays answerable.
func ProcessFrame(vehicleID, nodeID string, canID, timestamp int, data []byte) (model.CAN, []mapache.Signal) {
	producedAt := time.UnixMicro(int64(timestamp))

	var (
		signals []mapache.Signal
		meta    []byte
	)
	messageStruct := model.GetMessage(canID)
	switch {
	case messageStruct == nil:
		logger.SugarLogger.Infof("Received unknown message id: %d, frame stored without signals", canID)
		meta = MustJSON(map[string]any{
			"status": "unknown_can_id",
			"note":   fmt.Sprintf("no decoder registered for can id 0x%X", canID),
		})
	default:
		if err := messageStruct.FillFromBytes(data); err != nil {
			logger.SugarLogger.Infof("Error deserializing message id %d, frame stored without signals: %s", canID, err)
			meta = MustJSON(map[string]any{
				"status": "decode_error",
				"note":   err.Error(),
			})
		} else {
			signals = messageStruct.ExportSignals()
			meta = MustJSON(map[string]any{"status": "ok"})
		}
	}

	can := model.CAN{
		VehicleID:  vehicleID,
		NodeID:     nodeID,
		Timestamp:  timestamp,
		CANID:      canID,
		Bytes:      data,
		Metadata:   meta,
		ProducedAt: producedAt,
	}

	if len(signals) > 0 {
		now := time.Now().Truncate(time.Microsecond)
		for i := range signals {
			signals[i].Name = fmt.Sprintf("%s_%s", nodeID, signals[i].Name)
			signals[i].Timestamp = timestamp
			signals[i].VehicleID = vehicleID
			signals[i].ProducedAt = producedAt
			signals[i].CreatedAt = now
		}
	}

	return can, signals
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
	can, signals := ProcessFrame(vehicleID, nodeID, canID, ts, data)
	can.UploadKey = uploadKeyInt

	if _, err := CreateCAN(can); err != nil {
		logger.SugarLogger.Infof("Error creating CAN record: %s", err)
		return
	}

	if len(signals) > 0 {
		if err := CreateSignals(signals); err != nil {
			logger.SugarLogger.Infof("Error creating signals: %s", err)
			return
		}
		if config.EnableSignalWS {
			for _, s := range signals {
				Hub.Publish(s)
			}
		}
	}

	// Side-channel: when shelter announces a successful upload, hand off
	// to whichever module registered the hook (today: gr26/job/, which
	// enqueues a foreman ingest job).
	if canID == model.MsgIDShelterBatch && ShelterBatchHook != nil {
		go ShelterBatchHook(vehicleID, ts, data)
	}
}

// MustJSON marshals v to JSON, returning a sentinel error blob if
// marshaling fails. Exported because gr26/job's replayFrame builds the
// same status/note metadata blobs and we share this rather than copy it.
func MustJSON(v any) []byte {
	b, err := json.Marshal(v)
	if err != nil {
		// json.Marshal on a map of strings/strings can't fail in practice;
		// fall back to a literal so callers always get a valid jsonb value.
		return []byte(`{"status":"marshal_error"}`)
	}
	return b
}

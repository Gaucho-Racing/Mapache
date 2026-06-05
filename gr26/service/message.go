package service

import (
	"context"
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
)

// ShelterBatchHook is set by main.go to avoid a service → job import cycle.
var ShelterBatchHook func(vehicleID string, ts int, data []byte)

// minValidProducedAt is the cutoff for sane CAN-frame timestamps. The TCM
// can emit pre-NTP "epoch + uptime" microseconds before its clock syncs;
// anything stamped before this date is dropped as an invalid timestamp.
var minValidProducedAt = time.Date(2003, 10, 31, 0, 0, 0, 0, time.UTC)

// IsValidProducedAt reports whether the given microseconds-since-epoch
// resolves to a time at or after minValidProducedAt.
func IsValidProducedAt(tsMicros int) bool {
	return !time.UnixMicro(int64(tsMicros)).Before(minValidProducedAt)
}

func HandleInboundMessage(topic string, payload []byte) {
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
		go HandlePing(vehicleID, nodeID, payload)
		return
	} else if canID == "pong" {
		return
	}

	canID = strings.TrimPrefix(canID, "0x")
	canIDInt, err := strconv.ParseInt(canID, 16, 64)
	if err != nil {
		logger.SugarLogger.Infof("[MQ] Received invalid can id: %s, ignoring", canID)
		return
	}
	logger.SugarLogger.Infof("[MQ] Received message: %s", topic)
	go HandleMessage(vehicleID, nodeID, int(canIDInt), payload)
}

// ProcessFrame is pure data transformation: decode bytes → (CAN, signals).
// UploadKey on the returned CAN is left at 0 for the caller to fill in.
// Unknown canID, decode errors, and invalid timestamps return an empty
// signals list and a status blob in CAN.Metadata so the raw frame can
// still be persisted.
func ProcessFrame(vehicleID, nodeID string, canID, timestamp int, data []byte) (model.CAN, []mapache.Signal) {
	producedAt := time.UnixMicro(int64(timestamp))

	var (
		signals []mapache.Signal
		meta    []byte
	)
	switch {
	case !IsValidProducedAt(timestamp):
		logger.SugarLogger.Warnf("Frame with invalid timestamp: vehicle=%s node=%s can_id=0x%X ts=%d decoded=%s",
			vehicleID, nodeID, canID, timestamp, producedAt.UTC().Format(time.RFC3339Nano))
		meta = MustJSON(map[string]any{
			"status": "invalid_timestamp",
			"note":   fmt.Sprintf("ts=%d (%s) is before %s", timestamp, producedAt.UTC().Format(time.RFC3339Nano), minValidProducedAt.UTC().Format(time.RFC3339Nano)),
		})
	default:
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

	// Persist steps log-and-continue so one failure doesn't drop the rest.
	if _, err := CreateCAN(can); err != nil {
		logger.SugarLogger.Infof("Error creating CAN record: %s", err)
	}

	if len(signals) > 0 {
		if err := CreateSignals(signals); err != nil {
			logger.SugarLogger.Infof("Error creating signals: %s", err)
		}
		for _, s := range signals {
			topic := fmt.Sprintf("query/live/%s/%s", s.VehicleID, s.Name)
			mqtt.PublishJSON(context.Background(), topic, s)
		}
	}

	if canID == model.MsgIDShelterBatch && ShelterBatchHook != nil {
		go ShelterBatchHook(vehicleID, ts, data)
	}
}

// MustJSON marshals v, falling back to a sentinel blob on error so
// callers always get valid jsonb. Shared with gr26/job's replayFrame.
func MustJSON(v any) []byte {
	b, err := json.Marshal(v)
	if err != nil {
		return []byte(`{"status":"marshal_error"}`)
	}
	return b
}

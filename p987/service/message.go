package service

import (
	"context"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/gaucho-racing/mapache/p987/model"
	"github.com/gaucho-racing/mapache/p987/mqtt"
	"github.com/gaucho-racing/mapache/p987/pkg/logger"

	mapache "github.com/gaucho-racing/mapache/mapache-go/v3"
)

// Decode outcome statuses, recorded in the stored frame's metadata and
// counted by the decode reporter.
const (
	statusOK               = "ok"
	statusUnknownCANID     = "unknown_can_id"
	statusDecodeError      = "decode_error"
	statusInvalidTimestamp = "invalid_timestamp"
)

// headerSize is the relay's wire format: u64 BE microsecond timestamp
// followed by a u16 BE upload key, then the raw CAN payload.
const headerSize = 10

// minValidProducedAt is the cutoff for sane CAN-frame timestamps. A Pi
// with no RTC and no network boots to 1970, and the relay publishes
// whatever its clock says — anything stamped before this is pre-clock
// garbage. Kept in lockstep with the relay's own check.
var minValidProducedAt = time.Date(2003, 10, 31, 0, 0, 0, 0, time.UTC)

// IsValidProducedAt reports whether the given microseconds-since-epoch
// resolves to a time at or after minValidProducedAt.
func IsValidProducedAt(tsMicros int) bool {
	return !time.UnixMicro(int64(tsMicros)).Before(minValidProducedAt)
}

// HandleInboundMessage routes one MQTT message.
//
// Topic shape is p987/{vehicle_id}/{bus}/{can_id}, exactly four segments.
// The bus segment takes the place of gr26's node segment: on stock Porsche
// CAN the sender is implied by the arbitration id, so the bus is the only
// routing fact the id cannot carry.
func HandleInboundMessage(topic string, payload []byte) {
	parts := strings.Split(topic, "/")
	if len(parts) != 4 {
		logger.SugarLogger.Infof("[MQ] Received invalid topic: %s, ignoring", topic)
		return
	}
	vehicleID, bus, canID := parts[1], parts[2], parts[3]

	if vehicleID == "" {
		logger.SugarLogger.Infof("[MQ] Received invalid vehicle id: %s, ignoring", topic)
		return
	}
	if bus == "" {
		logger.SugarLogger.Infof("[MQ] Received invalid bus: %s, ignoring", topic)
		return
	}

	switch canID {
	case "ping":
		go HandlePing(vehicleID, bus, payload)
		return
	case "pong":
		// Our own reply echoed back by the shared subscription.
		return
	}

	canIDInt, err := strconv.ParseInt(strings.TrimPrefix(canID, "0x"), 16, 64)
	if err != nil {
		logger.SugarLogger.Infof("[MQ] Received invalid can id: %s, ignoring", canID)
		return
	}
	go HandleMessage(vehicleID, bus, int(canIDInt), payload)
}

// ProcessFrame is pure data transformation: bytes in, one CAN row and its
// signals out. UploadKey is left at 0 for the caller. Unknown ids, decode
// failures, and invalid timestamps yield no signals but still return a row
// with a status blob in Metadata, so the raw frame is never lost.
func ProcessFrame(vehicleID, bus string, canID, timestamp int, data []byte) (model.CAN, []mapache.Signal) {
	producedAt := time.UnixMicro(int64(timestamp))

	var (
		decoded []mapache.Signal
		meta    []byte
	)

	switch {
	case !IsValidProducedAt(timestamp):
		note := fmt.Sprintf("ts=%d (%s) is before %s", timestamp,
			producedAt.UTC().Format(time.RFC3339Nano), minValidProducedAt.UTC().Format(time.RFC3339Nano))
		NoteDecodeOutcome(bus, canID, statusInvalidTimestamp, note)
		meta = MustJSON(map[string]any{"status": statusInvalidTimestamp, "note": note})
	default:
		decoded, meta = decodeFrame(bus, canID, data)
	}

	can := model.CAN{
		VehicleID:  vehicleID,
		NodeID:     bus,
		Timestamp:  timestamp,
		CANID:      canID,
		Bytes:      data,
		Metadata:   meta,
		ProducedAt: producedAt,
	}

	if len(decoded) > 0 {
		now := time.Now().Truncate(time.Microsecond)
		for i := range decoded {
			// Prefixed with the bus for the same reason gr26 prefixes with
			// the node: it keeps names unique across buses and lets the
			// signal-to-frame join recover the segment from the name.
			decoded[i].Name = fmt.Sprintf("%s_%s", bus, decoded[i].Name)
			decoded[i].Timestamp = timestamp
			decoded[i].VehicleID = vehicleID
			decoded[i].ProducedAt = producedAt
			decoded[i].CreatedAt = now
		}
	}
	return can, decoded
}

// decodeFrame looks up the decoder for this id on this bus and runs it.
// Unknown ids and decode failures return no signals but a status blob, so
// the raw frame is still stored — that is how an unknown id gets
// reverse-engineered later.
func decodeFrame(bus string, canID int, data []byte) ([]mapache.Signal, []byte) {
	messageStruct := model.GetMessage(bus, canID)
	if messageStruct == nil {
		note := fmt.Sprintf("no decoder registered for can id 0x%X on bus %s", canID, bus)
		NoteDecodeOutcome(bus, canID, statusUnknownCANID, note)
		return nil, MustJSON(map[string]any{"status": statusUnknownCANID, "note": note})
	}
	if err := messageStruct.FillFromBytes(data); err != nil {
		note := err.Error()
		NoteDecodeOutcome(bus, canID, statusDecodeError, note)
		return nil, MustJSON(map[string]any{"status": statusDecodeError, "note": note})
	}
	NoteDecodeOutcome(bus, canID, statusOK, "")
	return messageStruct.ExportSignals(), MustJSON(map[string]any{"status": statusOK})
}

func HandleMessage(vehicleID string, bus string, canID int, message []byte) {
	if len(message) < headerSize {
		logger.SugarLogger.Infof("[MQ] Message too short, ignoring %d bytes", len(message))
		return
	}
	uploadKey := int(binary.BigEndian.Uint16(message[8:10]))
	if !ValidateUploadKey(vehicleID, uploadKey) {
		logger.SugarLogger.Infof("Upload key validation failed for vehicle %s, ignoring", vehicleID)
		return
	}

	ts := int(binary.BigEndian.Uint64(message[:8]))
	can, signals := ProcessFrame(vehicleID, bus, canID, ts, message[headerSize:])
	can.UploadKey = uploadKey

	// Persist steps log-and-continue so one failure doesn't drop the rest.
	if _, err := CreateCAN(can); err != nil {
		logger.SugarLogger.Infof("Error creating CAN record: %s", err)
	}

	if len(signals) == 0 {
		return
	}
	if err := CreateSignals(signals); err != nil {
		logger.SugarLogger.Infof("Error creating signals: %s", err)
	}
	for _, s := range signals {
		mqtt.PublishJSON(context.Background(), fmt.Sprintf("query/live/%s/%s", s.VehicleID, s.Name), s)
	}
}

// MustJSON marshals v, falling back to a sentinel blob on error so callers
// always get valid json for the metadata column.
func MustJSON(v any) []byte {
	b, err := json.Marshal(v)
	if err != nil {
		return []byte(`{"status":"marshal_error"}`)
	}
	return b
}

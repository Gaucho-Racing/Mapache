package service

import (
	"encoding/json"

	"github.com/gaucho-racing/mapache/live/pkg/logger"

	mapache "github.com/gaucho-racing/mapache/mapache-go/v3"
)

// HandleInboundMessage is the MQTT subscription callback. Topic shape is
// query/live/{vehicle_id}/{signal_name} (set by gr26 ingest); the payload
// is a JSON-marshaled Signal. We trust the payload's vehicle_id/name over
// the topic since the topic is purely a routing key.
func HandleInboundMessage(topic string, payload []byte) {
	var s mapache.Signal
	if err := json.Unmarshal(payload, &s); err != nil {
		logger.SugarLogger.Warnf("[MQ] Bad signal payload on %s: %v", topic, err)
		return
	}
	if s.VehicleID == "" || s.Name == "" || s.Timestamp == 0 {
		logger.SugarLogger.Warnf("[MQ] Dropping signal with missing fields on %s", topic)
		return
	}
	Recent.Put(s)
	Signals.Publish(s)
}

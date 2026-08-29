package service

import (
	"context"
	"encoding/binary"
	"fmt"
	"time"

	"github.com/gaucho-racing/mapache/p987/config"
	"github.com/gaucho-racing/mapache/p987/database"
	"github.com/gaucho-racing/mapache/p987/mqtt"
	"github.com/gaucho-racing/mapache/p987/pkg/logger"

	"github.com/gaucho-racing/mapache/mapache-go/v3"
)

// pingPayloadSize is the relay's ping: u64 BE microsecond timestamp
// followed by a u16 BE upload key.
const pingPayloadSize = 10

func HandlePing(vehicleID string, bus string, payload []byte) {
	if len(payload) < pingPayloadSize {
		logger.SugarLogger.Infof("[MQ] Ping too short, ignoring %d bytes", len(payload))
		return
	}
	ping := binary.BigEndian.Uint64(payload[:8])
	uploadKey := binary.BigEndian.Uint16(payload[8:10])
	if !ValidateUploadKey(vehicleID, int(uploadKey)) {
		logger.SugarLogger.Infof("Upload key validation failed for vehicle %s, ignoring", vehicleID)
		return
	}
	SendPong(vehicleID, bus, ping)
}

// SendPong echoes the original ping alongside our own clock so the relay
// can compute round-trip time without trusting our clock offset.
func SendPong(vehicleID string, bus string, ping uint64) {
	topic := fmt.Sprintf("%s/%s/%s/pong", config.TopicRoot, vehicleID, bus)
	pong := uint64(time.Now().UnixMicro())
	latency := pong - ping

	payload := make([]byte, 16)
	binary.BigEndian.PutUint64(payload, ping)
	binary.BigEndian.PutUint64(payload[8:], pong)

	mqtt.Publish(context.Background(), topic, payload)
	logger.SugarLogger.Infof("[PING] Received ping from %s/%s/%s in %dms", config.TopicRoot, vehicleID, bus, latency/1000)

	if err := CreatePing(mapache.Ping{
		VehicleID: vehicleID,
		Ping:      int(ping),
		Pong:      int(pong),
		Latency:   int(latency),
	}); err != nil {
		logger.SugarLogger.Infof("Error creating ping: %s", err)
	}
}

const insertPingSQL = `INSERT INTO ping (vehicle_id, ping, pong, latency) VALUES (?, ?, ?, ?)`

func CreatePing(ping mapache.Ping) error {
	if !config.ClickhouseEnabled() {
		return nil
	}
	ctx := database.InsertCtx(context.Background())
	return database.Conn.Exec(ctx, insertPingSQL,
		ping.VehicleID, int64(ping.Ping), int64(ping.Pong), int32(ping.Latency))
}

package service

import (
	"context"
	"encoding/binary"
	"fmt"
	"time"

	"github.com/gaucho-racing/mapache/gr26/config"
	"github.com/gaucho-racing/mapache/gr26/database"
	"github.com/gaucho-racing/mapache/gr26/mqtt"
	"github.com/gaucho-racing/mapache/gr26/pkg/logger"

	"github.com/gaucho-racing/mapache/mapache-go/v3"
)

func HandlePing(vehicleID string, nodeID string, payload []byte) {
	logger.SugarLogger.Infof("[MQ] Received ping from gr26/%s/%s", vehicleID, nodeID)
	ping := binary.BigEndian.Uint64(payload[:8])
	uploadKey := binary.BigEndian.Uint16(payload[8:10])
	if !ValidateUploadKey(vehicleID, int(uploadKey)) {
		logger.SugarLogger.Infof("Upload key validation failed for vehicle %s, ignoring", vehicleID)
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

	mqtt.Publish(context.Background(), topic, payload)
	logger.SugarLogger.Infof("[PING] Received ping from gr26/%s/%s in %dms", vehicleID, nodeID, latency/1000)

	err := CreatePing(mapache.Ping{
		VehicleID: vehicleID,
		Ping:      int(ping),
		Pong:      int(pong),
		Latency:   int(latency),
	})
	if err != nil {
		logger.SugarLogger.Infof("Error creating ping: %s", err)
	}
}

const insertPingSQL = `INSERT INTO ping (vehicle_id, ping, pong, latency) VALUES (?, ?, ?, ?)`

func CreatePing(ping mapache.Ping) error {
	if !config.EnableSignalDB {
		return nil
	}
	ctx := database.InsertCtx(context.Background())
	return database.Conn.Exec(ctx, insertPingSQL,
		ping.VehicleID, int64(ping.Ping), int64(ping.Pong), int32(ping.Latency))
}

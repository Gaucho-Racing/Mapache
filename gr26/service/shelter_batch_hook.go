package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/gaucho-racing/mapache/gr26/pkg/foreman"
	"github.com/gaucho-racing/mapache/gr26/pkg/logger"
)

// onShelterBatchReceived fires when a TCMShelterBatch frame lands in
// HandleMessage. We don't do anything with the batch payload directly —
// instead we enqueue a `gr26.ingest_latest_batch` job for a downstream
// worker to claim, which is the trigger that replaces our standalone
// S3 polling loop.
//
// idempotency_key is (vehicleID, batch-frame-timestamp). The timestamp
// is unique per frame (microsecond precision from tcm-mqtt), so MQTT
// retains / replays don't double-enqueue.
func onShelterBatchReceived(vehicleID string, ts int) {
	idem := fmt.Sprintf("gr26.ingest_latest_batch:%s:%d", vehicleID, ts)
	params, _ := json.Marshal(map[string]any{
		"vehicle_id":      vehicleID,
		"trigger_ts_us":   ts,
	})
	req := foreman.EnqueueRequest{
		Kind:           "gr26.ingest_latest_batch",
		Service:        "gr26",
		IdempotencyKey: &idem,
		Params:         params,
		MaxAttempts:    3,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := foreman.Enqueue(ctx, req); err != nil {
		logger.SugarLogger.Errorf("[SHELTER] failed to enqueue ingest job for %s: %v", vehicleID, err)
		return
	}
	logger.SugarLogger.Debugf("[SHELTER] enqueued gr26.ingest_latest_batch (vehicle=%s, ts=%d)", vehicleID, ts)
}

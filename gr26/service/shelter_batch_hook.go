package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/gaucho-racing/mapache/gr26/pkg/foreman"
	"github.com/gaucho-racing/mapache/gr26/pkg/logger"
	ulid "github.com/gaucho-racing/ulid-go"
)

// onShelterBatchReceived fires when a TCMShelterBatch frame lands in
// HandleMessage. The frame's last 16 payload bytes carry the raw ULID
// of the parquet file shelter just uploaded; we copy that into the
// foreman job's params so the downstream worker can target the file
// directly (no S3 scan, no dedup table).
//
// idempotency_key is (vehicleID, file_ulid). ULIDs are globally unique
// so two HandleMessage invocations for the same physical batch frame
// (MQTT retain / replay) collapse to a single foreman job.
func onShelterBatchReceived(vehicleID string, ts int, data []byte) {
	if len(data) < 32 {
		logger.SugarLogger.Warnf("[SHELTER] TCMShelterBatch frame too short (%d bytes, want 32) — ULID missing, not enqueuing", len(data))
		return
	}
	var u ulid.ULID
	copy(u[:], data[16:32])
	fileULID := u.String()

	idem := fmt.Sprintf("gr26.ingest_latest_batch:%s:%s", vehicleID, fileULID)
	params, _ := json.Marshal(map[string]any{
		"vehicle_id": vehicleID,
		"file_ulid":  fileULID,
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
		logger.SugarLogger.Errorf("[SHELTER] failed to enqueue ingest job for %s/%s: %v", vehicleID, fileULID, err)
		return
	}
	logger.SugarLogger.Debugf("[SHELTER] enqueued gr26.ingest_latest_batch (vehicle=%s, file_ulid=%s)", vehicleID, fileULID)
}

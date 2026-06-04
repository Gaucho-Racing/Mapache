// Package job is the home for cross-cutting work that gr26 producers
// or consumes via foreman. Today it's just shelter cold-storage ingest;
// new job kinds belong here so the service package stays focused on
// pure CAN-frame handling.
package job

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/parquet-go/parquet-go"
	mapache "github.com/gaucho-racing/mapache/mapache-go/v3"
	ulid "github.com/gaucho-racing/ulid-go"

	gr26config "github.com/gaucho-racing/mapache/gr26/config"
	"github.com/gaucho-racing/mapache/gr26/model"
	"github.com/gaucho-racing/mapache/gr26/pkg/foreman"
	"github.com/gaucho-racing/mapache/gr26/pkg/logger"
	"github.com/gaucho-racing/mapache/gr26/service"
)

// ─── producer side: gr26.ingest_latest_batch ────────────────────────────────

// OnShelterBatchReceived is wired into service.ShelterBatchHook by
// main.go. When a TCMShelterBatch CAN frame finishes processing in
// HandleMessage, this fires, reads the parquet file's ULID out of the
// trailing 16 bytes of the frame's data, and enqueues a foreman job
// pointing at that exact file.
//
// idempotency_key is (vehicleID, file_ulid). ULIDs are globally unique
// so retransmits collapse to a single foreman job.
func OnShelterBatchReceived(vehicleID string, ts int, data []byte) {
	if len(data) < 32 {
		logger.SugarLogger.Warnf("[SHELTER] TCMShelterBatch frame too short (%d bytes, want 32) — ULID missing, not enqueuing", len(data))
		return
	}
	var u ulid.ULID
	copy(u[:], data[16:32])
	fileULID := u.String()

	idem := fmt.Sprintf("gr26.ingest_latest_batch:%s:%s", vehicleID, fileULID)
	params, _ := json.Marshal(shelterIngestParams{
		VehicleID: vehicleID,
		FileULID:  fileULID,
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

// ─── consumer side: gr26.ingest_latest_batch worker ─────────────────────────

// shelterIngestParams is what foreman jobs carry as Params. The producer
// (OnShelterBatchReceived) writes it; the worker (IngestLatestBatchHandler)
// reads it. file_ulid names the exact parquet to fetch — no S3 scan, no
// dedup table; foreman's idempotency key is our only dedup.
type shelterIngestParams struct {
	VehicleID string `json:"vehicle_id"`
	FileULID  string `json:"file_ulid"`
}

// shelterRow mirrors the Parquet schema shelter writes to S3
// (see TCM-26/shelter/model/message.py).
type shelterRow struct {
	Timestamp  int64  `parquet:"timestamp"`
	VehicleID  string `parquet:"vehicle_id"`
	Topic      string `parquet:"topic"`
	Data       []byte `parquet:"data"`
	SourceNode string `parquet:"source_node"`
	TargetNode string `parquet:"target_node"`
}

// IngestLatestBatchHandler is the worker entrypoint registered for
// "gr26.ingest_latest_batch" jobs. Params name the exact parquet file
// to ingest, so this is a deterministic targeted fetch — no listing,
// no "what's the next unprocessed" question.
//
// On retry (foreman re-claim after lease expiry / restart), the same
// file gets reprocessed; the downstream upserts on gr26_can + signal
// keep that safe.
func IngestLatestBatchHandler(ctx context.Context, job *foreman.Job) error {
	if gr26config.ShelterS3Bucket == "" {
		return errors.New("shelter ingest configured at foreman but SHELTER_S3_BUCKET is unset")
	}
	var p shelterIngestParams
	if err := json.Unmarshal(job.Params, &p); err != nil {
		return fmt.Errorf("decode params: %w", err)
	}
	if p.VehicleID == "" || p.FileULID == "" {
		return fmt.Errorf("incomplete params: vehicle_id=%q file_ulid=%q", p.VehicleID, p.FileULID)
	}

	awsCfg, err := awsconfig.LoadDefaultConfig(ctx,
		awsconfig.WithRegion(gr26config.ShelterS3Region),
	)
	if err != nil {
		return fmt.Errorf("aws config: %w", err)
	}
	client := s3.NewFromConfig(awsCfg)

	// Path scheme must stay in sync with TCM-26 shelter/service/upload.py.
	prefix := strings.TrimRight(gr26config.ShelterS3Prefix, "/")
	key := fmt.Sprintf("%s/%s/batch_%s.parquet", prefix, p.VehicleID, p.FileULID)

	return processFile(ctx, client, key, p.FileULID)
}

func processFile(ctx context.Context, client *s3.Client, key, fileULID string) error {
	start := time.Now()
	logger.SugarLogger.Infof("[SHELTER] processing %s", key)

	obj, err := client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(gr26config.ShelterS3Bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return fmt.Errorf("get: %w", err)
	}
	defer obj.Body.Close()

	// Files are ~6 MB compressed at our current batch sizing — fine to
	// pull fully into memory on a cloud server. If sizes ever push past
	// a couple hundred MB we'd switch to a tempfile + io.ReaderAt.
	body, err := io.ReadAll(obj.Body)
	if err != nil {
		return fmt.Errorf("download: %w", err)
	}

	pr := parquet.NewGenericReader[shelterRow](bytes.NewReader(body))
	defer pr.Close()

	const chunk = 4096
	rows := make([]shelterRow, chunk)
	total := 0
	for {
		n, readErr := pr.Read(rows)
		for i := 0; i < n; i++ {
			dispatchRow(rows[i])
		}
		total += n
		if errors.Is(readErr, io.EOF) {
			break
		}
		if readErr != nil {
			return fmt.Errorf("parquet read: %w", readErr)
		}
	}

	logger.SugarLogger.Infof("[SHELTER] %s: %d rows in %s", key, total, time.Since(start))
	return nil
}

// dispatchRow parses the topic out of one Parquet row and runs it
// through replayFrame.
func dispatchRow(r shelterRow) {
	// Topic format: gr26/{vehicle}/{node}/0x{can_id_hex}
	parts := strings.Split(r.Topic, "/")
	if len(parts) != 4 {
		return
	}
	nodeID := parts[2]
	canIDStr := strings.TrimPrefix(parts[3], "0x")
	canIDInt, err := strconv.ParseInt(canIDStr, 16, 64)
	if err != nil {
		return
	}
	replayFrame(r.VehicleID, nodeID, int(canIDInt), int(r.Timestamp), r.Data)
}

// replayFrame is the cold-storage decode-and-persist function. Mirrors
// service.HandleMessage but standalone — no envelope parsing (caller
// already has ts and data), no upload-key validation (S3 access is the
// trust boundary), no WS publish (data is historical, dash shouldn't
// see it streaming), no side-channel hook (would recursively re-enqueue
// ingest jobs if the replayed frame happens to be a TCMShelterBatch
// itself).
//
// Intentionally duplicates the decode + CreateCAN + CreateSignals logic
// from HandleMessage rather than sharing a helper; live and replay are
// allowed to diverge cleanly without one being constrained by the other.
func replayFrame(vehicleID, nodeID string, canID, ts int, data []byte) {
	producedAt := time.UnixMicro(int64(ts))

	var (
		signals []mapache.Signal
		meta    []byte
	)
	messageStruct := model.GetMessage(canID)
	switch {
	case messageStruct == nil:
		logger.SugarLogger.Infof("Received unknown message id: %d, frame stored without signals", canID)
		meta = service.MustJSON(map[string]any{
			"status": "unknown_can_id",
			"note":   fmt.Sprintf("no decoder registered for can id 0x%X", canID),
		})
	default:
		if err := messageStruct.FillFromBytes(data); err != nil {
			logger.SugarLogger.Infof("Error deserializing message id %d, frame stored without signals: %s", canID, err)
			meta = service.MustJSON(map[string]any{
				"status": "decode_error",
				"note":   err.Error(),
			})
		} else {
			signals = messageStruct.ExportSignals()
			meta = service.MustJSON(map[string]any{"status": "ok"})
		}
	}

	_, err := service.CreateCAN(model.CAN{
		VehicleID:  vehicleID,
		NodeID:     nodeID,
		Timestamp:  ts,
		CANID:      canID,
		Bytes:      data,
		UploadKey:  0, // shelter-sourced; bucket access is the trust boundary
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
	if err := service.CreateSignals(signals); err != nil {
		logger.SugarLogger.Infof("Error creating signals: %s", err)
	}
}

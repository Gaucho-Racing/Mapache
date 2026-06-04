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
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/parquet-go/parquet-go"
	ulid "github.com/gaucho-racing/ulid-go"

	gr26config "github.com/gaucho-racing/mapache/gr26/config"
	"github.com/gaucho-racing/mapache/gr26/pkg/foreman"
	"github.com/gaucho-racing/mapache/gr26/pkg/logger"
	"github.com/gaucho-racing/mapache/gr26/service"
	"github.com/gaucho-racing/mapache/gr26/worker"
)

// ─── producer side: gr26.ingest_batch ───────────────────────────────────────

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

	idem := fmt.Sprintf("gr26.ingest_batch:%s:%s", vehicleID, fileULID)
	params, _ := json.Marshal(shelterIngestParams{
		VehicleID: vehicleID,
		FileULID:  fileULID,
	})
	req := foreman.EnqueueRequest{
		Kind:           "gr26.ingest_batch",
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
	logger.SugarLogger.Debugf("[SHELTER] enqueued gr26.ingest_batch (vehicle=%s, file_ulid=%s)", vehicleID, fileULID)
}

// ─── consumer side: gr26.ingest_batch worker ────────────────────────────────

// shelterIngestParams is what foreman jobs carry as Params. The producer
// (OnShelterBatchReceived) writes it; the worker (IngestBatchHandler)
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

// IngestBatchHandler is the worker entrypoint registered for
// "gr26.ingest_batch" jobs. Params name the exact parquet file to
// ingest, so this is a deterministic targeted fetch — no listing,
// no "what's the next unprocessed" question.
//
// On retry (foreman re-claim after lease expiry / restart), the same
// file gets reprocessed; the downstream upserts on gr26_can + signal
// keep that safe.
func IngestBatchHandler(ctx context.Context, job *foreman.Job, progress *worker.ProgressReporter) (json.RawMessage, error) {
	if gr26config.ShelterS3Bucket == "" {
		return nil, errors.New("shelter ingest configured at foreman but SHELTER_S3_BUCKET is unset")
	}
	var p shelterIngestParams
	if err := json.Unmarshal(job.Params, &p); err != nil {
		return nil, fmt.Errorf("decode params: %w", err)
	}
	if p.VehicleID == "" || p.FileULID == "" {
		return nil, fmt.Errorf("incomplete params: vehicle_id=%q file_ulid=%q", p.VehicleID, p.FileULID)
	}

	awsCfg, err := awsconfig.LoadDefaultConfig(ctx,
		awsconfig.WithRegion(gr26config.ShelterS3Region),
	)
	if err != nil {
		return nil, fmt.Errorf("aws config: %w", err)
	}
	client := s3.NewFromConfig(awsCfg)

	// Path scheme must stay in sync with TCM-26 shelter/service/upload.py.
	prefix := strings.TrimRight(gr26config.ShelterS3Prefix, "/")
	key := fmt.Sprintf("%s/%s/batch_%s.parquet", prefix, p.VehicleID, p.FileULID)

	return processFile(ctx, client, key, progress)
}

func processFile(ctx context.Context, client *s3.Client, key string, progress *worker.ProgressReporter) (json.RawMessage, error) {
	start := time.Now()
	logger.SugarLogger.Infof("[SHELTER] processing %s", key)
	progress.Set(0, 0, "downloading parquet from s3")

	obj, err := client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(gr26config.ShelterS3Bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return nil, fmt.Errorf("get: %w", err)
	}
	defer obj.Body.Close()

	// Files are ~6 MB compressed at our current batch sizing — fine to
	// pull fully into memory on a cloud server. If sizes ever push past
	// a couple hundred MB we'd switch to a tempfile + io.ReaderAt.
	body, err := io.ReadAll(obj.Body)
	if err != nil {
		return nil, fmt.Errorf("download: %w", err)
	}

	pr := parquet.NewGenericReader[shelterRow](bytes.NewReader(body))
	defer pr.Close()
	totalRows := pr.NumRows()
	progress.Set(0, totalRows, "decoding parquet rows")

	stats := newIngestStats()
	const chunk = 4096
	rows := make([]shelterRow, chunk)
	total := 0
	for {
		n, readErr := pr.Read(rows)
		for i := 0; i < n; i++ {
			dispatchRow(rows[i], stats)
		}
		total += n
		progress.Set(int64(total), totalRows, "decoding parquet rows")
		if errors.Is(readErr, io.EOF) {
			break
		}
		if readErr != nil {
			return nil, fmt.Errorf("parquet read: %w", readErr)
		}
	}

	duration := time.Since(start)
	// Pin progress to (total, total) so the worker's final heartbeat
	// flush stores a clean 100% reading instead of whatever the last
	// in-flight tick caught.
	progress.Set(totalRows, totalRows, "complete")
	logger.SugarLogger.Infof("[SHELTER] %s: %d rows in %s (decoded=%d unknown=%d errors=%d)",
		key, total, duration, stats.decoded, stats.unknown, stats.decodeError)

	return json.Marshal(ingestResult{
		TotalRows:            total,
		Decoded:              stats.decoded,
		UnknownCanID:         stats.unknown,
		DecodeError:          stats.decodeError,
		DurationMs:           duration.Milliseconds(),
		UnknownBreakdown:     topUnknown(stats.unknownByCanID, 10),
		DecodeErrorBreakdown: topErrors(stats.errorByCanID, 10),
	})
}

// dispatchRow parses the topic out of one Parquet row and runs it
// through replayFrame, threading the per-job stats accumulator.
func dispatchRow(r shelterRow, stats *ingestStats) {
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
	replayFrame(r.VehicleID, nodeID, int(canIDInt), int(r.Timestamp), r.Data, stats)
}

// replayFrame is the cold-storage decode-and-persist function. Shares
// the pure decode step (service.ProcessFrame) with the live MQTT path;
// the persistence side-effects diverge here — UploadKey stays 0 since
// shelter-sourced frames don't carry one, no WS publish (data is
// historical), no side-channel hook (would recursively re-enqueue
// ingest jobs if the replayed frame is itself a TCMShelterBatch).
func replayFrame(vehicleID, nodeID string, canID, ts int, data []byte, stats *ingestStats) {
	can, signals := service.ProcessFrame(vehicleID, nodeID, canID, ts, data)
	// UploadKey left at 0 — bucket access is the trust boundary.

	stats.record(canID, can.Metadata)

	if _, err := service.CreateCAN(can); err != nil {
		logger.SugarLogger.Infof("Error creating CAN record: %s", err)
	}
	if len(signals) > 0 {
		if err := service.CreateSignals(signals); err != nil {
			logger.SugarLogger.Infof("Error creating signals: %s", err)
		}
	}
}

// ─── result reporting ───────────────────────────────────────────────────────

// ingestStats accumulates per-canID outcomes as the parquet rows stream
// through. Running totals (decoded/unknown/decodeError) are kept so we
// don't have to re-sum the maps at the end.
type ingestStats struct {
	decoded        int
	unknown        int
	decodeError    int
	unknownByCanID map[int]int
	errorByCanID   map[int]decodeErrorSample
}

type decodeErrorSample struct {
	count  int
	sample string
}

func newIngestStats() *ingestStats {
	return &ingestStats{
		unknownByCanID: make(map[int]int),
		errorByCanID:   make(map[int]decodeErrorSample),
	}
}

// record peeks at the metadata blob ProcessFrame just built to bucket
// this row's outcome. Unknown statuses are silently ignored — they can
// only happen if ProcessFrame grows a new status string without us
// noticing, and counting them as "not decoded" would be misleading.
func (s *ingestStats) record(canID int, metadata []byte) {
	var meta struct {
		Status string `json:"status"`
		Note   string `json:"note"`
	}
	if err := json.Unmarshal(metadata, &meta); err != nil {
		return
	}
	switch meta.Status {
	case "ok":
		s.decoded++
	case "unknown_can_id":
		s.unknown++
		s.unknownByCanID[canID]++
	case "decode_error":
		s.decodeError++
		e := s.errorByCanID[canID]
		e.count++
		if e.sample == "" {
			e.sample = meta.Note
		}
		s.errorByCanID[canID] = e
	}
}

type breakdownEntry struct {
	CanID string `json:"can_id"`
	Count int    `json:"count"`
}

type errorBreakdownEntry struct {
	CanID       string `json:"can_id"`
	Count       int    `json:"count"`
	SampleError string `json:"sample_error,omitempty"`
}

// ingestResult is the json shape stored on foreman's job.result column.
// Top-N caps keep payload size bounded even on pathological batches.
type ingestResult struct {
	TotalRows            int                   `json:"total_rows"`
	Decoded              int                   `json:"decoded"`
	UnknownCanID         int                   `json:"unknown_can_id"`
	DecodeError          int                   `json:"decode_error"`
	DurationMs           int64                 `json:"duration_ms"`
	UnknownBreakdown     []breakdownEntry      `json:"unknown_breakdown,omitempty"`
	DecodeErrorBreakdown []errorBreakdownEntry `json:"decode_error_breakdown,omitempty"`
}

func topUnknown(m map[int]int, n int) []breakdownEntry {
	if len(m) == 0 {
		return nil
	}
	out := make([]breakdownEntry, 0, len(m))
	for id, count := range m {
		out = append(out, breakdownEntry{
			CanID: fmt.Sprintf("0x%X", id),
			Count: count,
		})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Count > out[j].Count })
	if len(out) > n {
		out = out[:n]
	}
	return out
}

func topErrors(m map[int]decodeErrorSample, n int) []errorBreakdownEntry {
	if len(m) == 0 {
		return nil
	}
	out := make([]errorBreakdownEntry, 0, len(m))
	for id, e := range m {
		out = append(out, errorBreakdownEntry{
			CanID:       fmt.Sprintf("0x%X", id),
			Count:       e.count,
			SampleError: e.sample,
		})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Count > out[j].Count })
	if len(out) > n {
		out = out[:n]
	}
	return out
}

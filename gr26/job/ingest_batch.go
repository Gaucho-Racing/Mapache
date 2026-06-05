// Package job holds foreman-driven work (currently shelter cold-storage ingest).
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

// OnShelterBatchReceived reads the parquet file ULID from the trailing
// 16 bytes of a TCMShelterBatch frame and enqueues a foreman ingest job.
// Idempotency key is (vehicleID, file_ulid) so retransmits collapse.
func OnShelterBatchReceived(vehicleID string, ts int, data []byte) {
	if len(data) < 32 {
		logger.SugarLogger.Warnf("[SHELTER] TCMShelterBatch frame too short (%d bytes, want 32) — ULID missing, not enqueuing", len(data))
		return
	}
	var u ulid.ULID
	copy(u[:], data[16:32])
	fileULID := u.String()

	idem := fmt.Sprintf("%s:%s", vehicleID, fileULID)
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
	if _, err := foreman.Enqueue(ctx, req); err != nil {
		logger.SugarLogger.Errorf("[SHELTER] failed to enqueue ingest job for %s/%s: %v", vehicleID, fileULID, err)
		return
	}
	logger.SugarLogger.Debugf("[SHELTER] enqueued gr26.ingest_batch (vehicle=%s, file_ulid=%s)", vehicleID, fileULID)
}

// ─── consumer side: gr26.ingest_batch worker ────────────────────────────────

// shelterIngestParams is the foreman job payload.
type shelterIngestParams struct {
	VehicleID string `json:"vehicle_id"`
	FileULID  string `json:"file_ulid"`
}

// shelterRow mirrors the Parquet schema in TCM-26/shelter/model/message.py.
type shelterRow struct {
	Timestamp  int64  `parquet:"timestamp"`
	VehicleID  string `parquet:"vehicle_id"`
	Topic      string `parquet:"topic"`
	Data       []byte `parquet:"data"`
	SourceNode string `parquet:"source_node"`
	TargetNode string `parquet:"target_node"`
}

// IngestBatchHandler is the worker for "gr26.ingest_batch". Retries are
// safe because the downstream ReplacingMergeTree dedups on natural keys.
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

	client, err := newS3Client(ctx)
	if err != nil {
		return nil, err
	}

	res, err := processFile(ctx, client, shelterKey(p.VehicleID, p.FileULID), progress)
	if err != nil {
		return nil, err
	}
	res.FileULID = p.FileULID
	return json.Marshal(res)
}

func processFile(ctx context.Context, client *s3.Client, key string, progress *worker.ProgressReporter) (ingestResult, error) {
	start := time.Now()
	logger.SugarLogger.Infof("[SHELTER] processing %s", key)
	progress.Set(0, 0, "downloading parquet from s3")

	obj, err := client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(gr26config.ShelterS3Bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return ingestResult{}, fmt.Errorf("get: %w", err)
	}
	defer obj.Body.Close()

	// ~6 MB compressed today — fine to buffer fully in memory.
	body, err := io.ReadAll(obj.Body)
	if err != nil {
		return ingestResult{}, fmt.Errorf("download: %w", err)
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
			return ingestResult{}, fmt.Errorf("parquet read: %w", readErr)
		}
	}

	duration := time.Since(start)
	// Pin to (total, total) so the final heartbeat stores a clean 100%.
	progress.Set(totalRows, totalRows, "complete")
	logger.SugarLogger.Infof("[SHELTER] %s: %d rows in %s (decoded=%d unknown=%d errors=%d invalid_timestamp=%d)",
		key, total, duration, stats.decoded, stats.unknown, stats.decodeError, stats.invalidTimestamp)

	return ingestResult{
		TotalRows:            total,
		Decoded:              stats.decoded,
		UnknownCanID:         stats.unknown,
		DecodeError:          stats.decodeError,
		InvalidTimestamp:     stats.invalidTimestamp,
		DurationMs:           duration.Milliseconds(),
		UnknownBreakdown:     topUnknown(stats.unknownByCanID, 10),
		DecodeErrorBreakdown: topErrors(stats.errorByCanID, 10),
	}, nil
}

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

// replayFrame is the cold-storage decode-and-persist path. UploadKey
// stays 0 (bucket access is the trust boundary), and no WS/side-channel
// firing — historical data, and we don't want to re-enqueue shelter batches.
func replayFrame(vehicleID, nodeID string, canID, ts int, data []byte, stats *ingestStats) {
	if !service.IsValidProducedAt(ts) {
		stats.invalidTimestamp++
		return
	}
	can, signals := service.ProcessFrame(vehicleID, nodeID, canID, ts, data)
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

type ingestStats struct {
	decoded          int
	unknown          int
	decodeError      int
	invalidTimestamp int
	unknownByCanID   map[int]int
	errorByCanID     map[int]decodeErrorSample
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

// ingestResult lands on foreman.job.result. Top-N caps bound payload size.
type ingestResult struct {
	FileULID             string                `json:"file_ulid,omitempty"`
	TotalRows            int                   `json:"total_rows"`
	Decoded              int                   `json:"decoded"`
	UnknownCanID         int                   `json:"unknown_can_id"`
	DecodeError          int                   `json:"decode_error"`
	InvalidTimestamp     int                   `json:"invalid_timestamp,omitempty"`
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

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
	"github.com/gaucho-racing/mapache/gr26/model"
	"github.com/gaucho-racing/mapache/gr26/pkg/foreman"
	"github.com/gaucho-racing/mapache/gr26/pkg/logger"
	"github.com/gaucho-racing/mapache/gr26/service"

	mapache "github.com/gaucho-racing/mapache/mapache-go/v3"
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
	if _, err := foreman.Default.Enqueue(ctx, req); err != nil {
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
func IngestBatchHandler(ctx context.Context, job foreman.Job, progress *foreman.Progress) (json.RawMessage, error) {
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

	// Report stats on both paths — foreman records the result on a failed run
	// too, so a partial-failure attempt still says what landed and what didn't.
	res, procErr := processFile(ctx, client, shelterKey(p.VehicleID, p.FileULID), progress)
	res.FileULID = p.FileULID
	payload, err := json.Marshal(res)
	if err != nil {
		return nil, errors.Join(procErr, fmt.Errorf("encode result: %w", err))
	}
	return payload, procErr
}

func processFile(ctx context.Context, client *s3.Client, key string, progress *foreman.Progress) (ingestResult, error) {
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
	cans := make([]model.CAN, 0, chunk)
	signals := make([]mapache.Signal, 0, chunk)
	total := 0
	chunkIdx := 0
	var flushErr error
	for {
		n, readErr := pr.Read(rows)
		cans, signals = cans[:0], signals[:0]
		for i := 0; i < n; i++ {
			can, sigs, ok := dispatchRow(rows[i], stats)
			if !ok {
				continue
			}
			cans = append(cans, can)
			signals = append(signals, sigs...)
		}
		// One flush per chunk. Keep going past a failed insert so the rest of
		// the file still lands, but hold onto the first error and fail the job
		// below — a dropped chunk is up to 4,096 frames, so it has to burn a
		// foreman attempt rather than report success (RMT dedup makes the
		// re-processed chunks harmless).
		if err := service.CreateCANs(cans); err != nil {
			logger.SugarLogger.Errorf("[SHELTER] %s: chunk %d: failed to insert %d CAN records: %s", key, chunkIdx, len(cans), err)
			stats.recordInsertFailure(insertTargetCANs, chunkIdx, len(cans), err)
			if flushErr == nil {
				flushErr = fmt.Errorf("insert cans: %w", err)
			}
		}
		if err := service.CreateSignals(signals); err != nil {
			logger.SugarLogger.Errorf("[SHELTER] %s: chunk %d: failed to insert %d signals: %s", key, chunkIdx, len(signals), err)
			stats.recordInsertFailure(insertTargetSignals, chunkIdx, len(signals), err)
			if flushErr == nil {
				flushErr = fmt.Errorf("insert signals: %w", err)
			}
		}
		total += n
		chunkIdx++
		progress.Set(int64(total), totalRows, "decoding parquet rows")
		if errors.Is(readErr, io.EOF) {
			break
		}
		if readErr != nil {
			return stats.result(total, time.Since(start)), fmt.Errorf("parquet read: %w", readErr)
		}
	}

	duration := time.Since(start)
	if flushErr != nil {
		// Every row decoded, so the counters legitimately read 100% — don't
		// claim "complete" though, the inserts didn't all land. Best-effort:
		// only lands if a heartbeat tick catches it before the handler returns.
		progress.Set(int64(total), totalRows, fmt.Sprintf("%d chunk insert(s) failed", stats.failedInserts))
		logger.SugarLogger.Errorf("[SHELTER] %s: %d rows in %s, %d chunk insert(s) failed (cans_dropped=%d signals_dropped=%d)",
			key, total, duration, stats.failedInserts, stats.cansDropped, stats.signalsDropped)
		return stats.result(total, duration), flushErr
	}

	// Pin to (total, total) so the final heartbeat stores a clean 100%.
	progress.Set(totalRows, totalRows, "complete")
	logger.SugarLogger.Infof("[SHELTER] %s: %d rows in %s (decoded=%d unknown=%d errors=%d invalid_timestamp=%d)",
		key, total, duration, stats.decoded, stats.unknown, stats.decodeError, stats.invalidTimestamp)

	return stats.result(total, duration), nil
}

// dispatchRow is the cold-storage decode path — persistence happens in
// per-chunk flushes upstream. UploadKey stays 0 (bucket access is the
// trust boundary), and no WS/side-channel firing — historical data, and
// we don't want to re-enqueue shelter batches.
func dispatchRow(r shelterRow, stats *ingestStats) (model.CAN, []mapache.Signal, bool) {
	// Topic format: gr26/{vehicle}/{node}/0x{can_id_hex}
	parts := strings.Split(r.Topic, "/")
	if len(parts) != 4 {
		return model.CAN{}, nil, false
	}
	nodeID := parts[2]
	canIDStr := strings.TrimPrefix(parts[3], "0x")
	canIDInt, err := strconv.ParseInt(canIDStr, 16, 64)
	if err != nil {
		return model.CAN{}, nil, false
	}
	can, signals := service.ProcessFrame(r.VehicleID, nodeID, int(canIDInt), int(r.Timestamp), r.Data)
	stats.record(int(canIDInt), nodeID, int(r.Timestamp), can.Metadata)
	return can, signals, true
}

// ─── result reporting ───────────────────────────────────────────────────────

const invalidTimestampSampleLimit = 10
const insertFailureSampleLimit = 10

type ingestStats struct {
	decoded                 int
	unknown                 int
	decodeError             int
	invalidTimestamp        int
	failedInserts           int
	cansDropped             int
	signalsDropped          int
	unknownByCanID          map[int]int
	errorByCanID            map[int]decodeErrorSample
	invalidTimestampSamples []invalidTimestampSample
	insertFailureSamples    []insertFailureSample
}

// insertTarget names which per-chunk flush failed, and lands verbatim in
// the job result.
type insertTarget string

const (
	insertTargetCANs    insertTarget = "cans"
	insertTargetSignals insertTarget = "signals"
)

type decodeErrorSample struct {
	count  int
	sample string
}

type invalidTimestampSample struct {
	Timestamp int    `json:"timestamp"`
	Decoded   string `json:"decoded"`
	CanID     string `json:"can_id"`
	NodeID    string `json:"node_id"`
}

type insertFailureSample struct {
	Target insertTarget `json:"target"`
	Chunk  int          `json:"chunk"`
	Rows   int          `json:"rows"`
	Error  string       `json:"error"`
}

func newIngestStats() *ingestStats {
	return &ingestStats{
		unknownByCanID: make(map[int]int),
		errorByCanID:   make(map[int]decodeErrorSample),
	}
}

// recordInsertFailure notes a chunk that decoded fine but never landed in
// ClickHouse, so the result can distinguish "decoded" from "persisted".
func (s *ingestStats) recordInsertFailure(target insertTarget, chunk, rows int, err error) {
	s.failedInserts++
	switch target {
	case insertTargetCANs:
		s.cansDropped += rows
	case insertTargetSignals:
		s.signalsDropped += rows
	}
	if len(s.insertFailureSamples) < insertFailureSampleLimit {
		s.insertFailureSamples = append(s.insertFailureSamples, insertFailureSample{
			Target: target,
			Chunk:  chunk,
			Rows:   rows,
			Error:  err.Error(),
		})
	}
}

func (s *ingestStats) record(canID int, nodeID string, ts int, metadata []byte) {
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
	case "invalid_timestamp":
		s.invalidTimestamp++
		if len(s.invalidTimestampSamples) < invalidTimestampSampleLimit {
			s.invalidTimestampSamples = append(s.invalidTimestampSamples, invalidTimestampSample{
				Timestamp: ts,
				Decoded:   time.UnixMicro(int64(ts)).UTC().Format(time.RFC3339Nano),
				CanID:     fmt.Sprintf("0x%X", canID),
				NodeID:    nodeID,
			})
		}
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

// ingestResult lands on foreman.job.result — on failed attempts too, so a
// partial-failure run still reports what landed. Top-N caps bound payload
// size. Decoded counts what decoded, not what persisted: subtract
// CANsDropped / SignalsDropped for that.
type ingestResult struct {
	FileULID                string                   `json:"file_ulid,omitempty"`
	TotalRows               int                      `json:"total_rows"`
	Decoded                 int                      `json:"decoded"`
	UnknownCanID            int                      `json:"unknown_can_id"`
	DecodeError             int                      `json:"decode_error"`
	InvalidTimestamp        int                      `json:"invalid_timestamp,omitempty"`
	FailedInserts           int                      `json:"failed_inserts,omitempty"`
	CANsDropped             int                      `json:"cans_dropped,omitempty"`
	SignalsDropped          int                      `json:"signals_dropped,omitempty"`
	DurationMs              int64                    `json:"duration_ms"`
	UnknownBreakdown        []breakdownEntry         `json:"unknown_breakdown,omitempty"`
	DecodeErrorBreakdown    []errorBreakdownEntry    `json:"decode_error_breakdown,omitempty"`
	InvalidTimestampSamples []invalidTimestampSample `json:"invalid_timestamp_samples,omitempty"`
	InsertFailureSamples    []insertFailureSample    `json:"insert_failure_samples,omitempty"`
}

// result snapshots the stats into the foreman result payload. Called on the
// success and failure paths alike so a failed attempt still reports coverage.
func (s *ingestStats) result(totalRows int, duration time.Duration) ingestResult {
	return ingestResult{
		TotalRows:               totalRows,
		Decoded:                 s.decoded,
		UnknownCanID:            s.unknown,
		DecodeError:             s.decodeError,
		InvalidTimestamp:        s.invalidTimestamp,
		FailedInserts:           s.failedInserts,
		CANsDropped:             s.cansDropped,
		SignalsDropped:          s.signalsDropped,
		DurationMs:              duration.Milliseconds(),
		UnknownBreakdown:        topUnknown(s.unknownByCanID, 10),
		DecodeErrorBreakdown:    topErrors(s.errorByCanID, 10),
		InvalidTimestampSamples: s.invalidTimestampSamples,
		InsertFailureSamples:    s.insertFailureSamples,
	}
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

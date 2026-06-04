package service

import (
	"bytes"
	"context"
	"encoding/binary"
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

	gr26config "github.com/gaucho-racing/mapache/gr26/config"
	"github.com/gaucho-racing/mapache/gr26/pkg/foreman"
	"github.com/gaucho-racing/mapache/gr26/pkg/logger"
)

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

// shelterIngestParams is what the foreman job body carries to point at
// a specific parquet file. Producer side (shelter_batch_hook.go) writes
// these; worker side (this file) reads them. No S3 scan needed —
// foreman itself is the dedup mechanism (its idempotency_key collapses
// duplicate enqueues from MQTT replay).
type shelterIngestParams struct {
	VehicleID string `json:"vehicle_id"`
	FileULID  string `json:"file_ulid"`
}

// IngestLatestBatchHandler is the worker entrypoint for
// "gr26.ingest_latest_batch" jobs. The job's params name the exact
// parquet file to ingest, so this is a fully deterministic targeted
// fetch — no listing, no "what's the next unprocessed" question.
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

// dispatchRow runs one Parquet row through the same decode/persist path
// the live MQTT subscriber uses. We rebuild the message envelope
// HandleMessage expects (timestamp u64 BE || upload_key u16 BE || data)
// with upload_key zeroed — shelter-sourced frames bypass key validation
// since they came from our own S3 bucket. The cloud gr26 deployment is
// expected to run with SKIP_AUTH_CHECK=true.
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

	envelope := make([]byte, 10+len(r.Data))
	binary.BigEndian.PutUint64(envelope[0:8], uint64(r.Timestamp))
	// envelope[8:10] = upload_key (left zero)
	copy(envelope[10:], r.Data)

	HandleMessage(r.VehicleID, nodeID, int(canIDInt), envelope)
}

package service

import (
	"bytes"
	"context"
	"encoding/binary"
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
	"github.com/gaucho-racing/mapache/gr26/database"
	"github.com/gaucho-racing/mapache/gr26/model"
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

// StartShelterIngest spins up the S3 polling loop in the background.
// No-op when SHELTER_S3_BUCKET is unset, so the on-car gr26 deployment
// stays out of S3.
func StartShelterIngest() {
	if gr26config.ShelterS3Bucket == "" {
		logger.SugarLogger.Infoln("[SHELTER] ingest disabled (SHELTER_S3_BUCKET unset)")
		return
	}
	go runShelterIngest()
}

func runShelterIngest() {
	ctx := context.Background()
	awsCfg, err := awsconfig.LoadDefaultConfig(ctx,
		awsconfig.WithRegion(gr26config.ShelterS3Region),
	)
	if err != nil {
		logger.SugarLogger.Errorf("[SHELTER] AWS config load failed: %v", err)
		return
	}
	client := s3.NewFromConfig(awsCfg)

	logger.SugarLogger.Infof("[SHELTER] starting (bucket=%s prefix=%q interval=%ds)",
		gr26config.ShelterS3Bucket, gr26config.ShelterS3Prefix, gr26config.ShelterPollIntervalSec)

	for {
		if err := pollOnce(ctx, client); err != nil {
			logger.SugarLogger.Errorf("[SHELTER] poll iteration failed: %v", err)
		}
		time.Sleep(time.Duration(gr26config.ShelterPollIntervalSec) * time.Second)
	}
}

func pollOnce(ctx context.Context, client *s3.Client) error {
	var continuationToken *string
	for {
		out, err := client.ListObjectsV2(ctx, &s3.ListObjectsV2Input{
			Bucket:            aws.String(gr26config.ShelterS3Bucket),
			Prefix:            aws.String(gr26config.ShelterS3Prefix),
			ContinuationToken: continuationToken,
		})
		if err != nil {
			return fmt.Errorf("list: %w", err)
		}

		for _, obj := range out.Contents {
			key := aws.ToString(obj.Key)
			if !strings.HasSuffix(key, ".parquet") {
				continue
			}
			fileULID := extractULID(key)
			if fileULID == "" {
				continue
			}
			if alreadyIngested(fileULID) {
				continue
			}
			if err := processFile(ctx, client, key, fileULID); err != nil {
				logger.SugarLogger.Errorf("[SHELTER] %s failed: %v", key, err)
				continue
			}
		}

		if !aws.ToBool(out.IsTruncated) {
			return nil
		}
		continuationToken = out.NextContinuationToken
	}
}

// extractULID pulls the file ULID out of an S3 key like
// "<prefix>/batch_01k....parquet". Returns "" if the shape doesn't match.
func extractULID(key string) string {
	base := key
	if idx := strings.LastIndex(key, "/"); idx >= 0 {
		base = key[idx+1:]
	}
	base = strings.TrimSuffix(base, ".parquet")
	const prefix = "batch_"
	if !strings.HasPrefix(base, prefix) {
		return ""
	}
	return base[len(prefix):]
}

func alreadyIngested(fileULID string) bool {
	var count int64
	database.DB.Model(&model.ShelterIngested{}).Where("file_ulid = ?", fileULID).Count(&count)
	return count > 0
}

func markIngested(fileULID, key string, rows int) error {
	return database.DB.Create(&model.ShelterIngested{
		FileULID: fileULID,
		S3Key:    key,
		Rows:     rows,
	}).Error
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

	if err := markIngested(fileULID, key, total); err != nil {
		return fmt.Errorf("mark ingested: %w", err)
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

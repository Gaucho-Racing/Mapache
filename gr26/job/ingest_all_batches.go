package job

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	gr26config "github.com/gaucho-racing/mapache/gr26/config"
	"github.com/gaucho-racing/mapache/gr26/pkg/foreman"
	"github.com/gaucho-racing/mapache/gr26/pkg/logger"
	"github.com/gaucho-racing/mapache/gr26/worker"
)

// ingestAllParams is the params shape for gr26.ingest_all_batches jobs.
// Hours is how far back from "now" we look; a 24 means anything uploaded
// in the last day. Reingest=true bypasses the standard idempotency key
// so files that were previously ingested get queued again (the key is
// scoped to this fan-out's parent job ID so the run stays internally
// idempotent against worker retries).
type ingestAllParams struct {
	VehicleID string `json:"vehicle_id"`
	Hours     int    `json:"hours"`
	Reingest  bool   `json:"reingest,omitempty"`
}

// ingestAllResult is the json shape stored on foreman's job.result. The
// per-file Entries list reflects every file the handler tried to enqueue
// — including ones that 409'd because they were already enqueued under
// the same idempotency key.
type ingestAllResult struct {
	VehicleID        string           `json:"vehicle_id"`
	HoursBack        int              `json:"hours_back"`
	Reingest         bool             `json:"reingest,omitempty"`
	Found            int              `json:"found"`
	Enqueued         int              `json:"enqueued"`
	AlreadyEnqueued  int              `json:"already_enqueued"`
	Failed           int              `json:"failed,omitempty"`
	Entries          []ingestAllEntry `json:"entries"`
}

type ingestAllEntry struct {
	FileULID string `json:"file_ulid"`
	JobID    string `json:"job_id,omitempty"`
	Status   string `json:"status"` // "enqueued" | "already_enqueued" | "failed"
	Error    string `json:"error,omitempty"`
}

// IngestAllBatchesHandler fans out: lists every shelter parquet for the
// given vehicle, filters to those uploaded in the last `hours` hours,
// and enqueues one gr26.ingest_batch job per file. Returns immediately
// once enqueueing is done; the spawned ingests run independently and
// show up as their own rows in /jobs.
//
// Default idempotency keys match the live-feed producer
// (<vehicle>:<file_ulid>) so re-running this handler on the same window
// is a no-op for already-known files.
//
// Reingest=true scopes the key to this fan-out's parent job ID
// (reingest:<parent_id>:<vehicle>:<file_ulid>) so previously-ingested
// files get re-processed, while a worker retry of this same parent
// still collapses to one ingest per file.
func IngestAllBatchesHandler(ctx context.Context, j *foreman.Job, progress *worker.ProgressReporter) (json.RawMessage, error) {
	if gr26config.ShelterS3Bucket == "" {
		return nil, errors.New("shelter ingest configured at foreman but SHELTER_S3_BUCKET is unset")
	}
	var p ingestAllParams
	if err := json.Unmarshal(j.Params, &p); err != nil {
		return nil, fmt.Errorf("decode params: %w", err)
	}
	if p.VehicleID == "" {
		return nil, errors.New("missing vehicle_id")
	}
	if p.Hours <= 0 {
		return nil, errors.New("hours must be > 0")
	}

	client, err := newS3Client(ctx)
	if err != nil {
		return nil, err
	}

	progress.Set(0, 0, "listing shelter bucket")
	objects, err := listShelterObjects(ctx, client, p.VehicleID)
	if err != nil {
		return nil, err
	}

	since := time.Now().Add(-time.Duration(p.Hours) * time.Hour)
	inRange := make([]shelterObject, 0, len(objects))
	for _, o := range objects {
		if o.LastModified.After(since) {
			inRange = append(inRange, o)
		}
	}

	logger.SugarLogger.Infof("[SHELTER] ingest_all for %s: %d/%d files in last %dh",
		p.VehicleID, len(inRange), len(objects), p.Hours)

	progress.Set(0, int64(len(inRange)), "enqueueing ingest jobs")

	res := ingestAllResult{
		VehicleID: p.VehicleID,
		HoursBack: p.Hours,
		Reingest:  p.Reingest,
		Found:     len(inRange),
		Entries:   make([]ingestAllEntry, 0, len(inRange)),
	}
	for i, o := range inRange {
		fileULID := extractFileULID(o.Key)
		entry := ingestAllEntry{FileULID: fileULID}

		var idem string
		if p.Reingest {
			idem = fmt.Sprintf("reingest:%s:%s:%s", j.ID, p.VehicleID, fileULID)
		} else {
			idem = fmt.Sprintf("%s:%s", p.VehicleID, fileULID)
		}
		params, _ := json.Marshal(shelterIngestParams{
			VehicleID: p.VehicleID,
			FileULID:  fileULID,
		})
		out, err := foreman.Enqueue(ctx, foreman.EnqueueRequest{
			Kind:           "gr26.ingest_batch",
			Service:        "gr26",
			IdempotencyKey: &idem,
			Params:         params,
			MaxAttempts:    3,
		})
		switch {
		case err != nil:
			entry.Status = "failed"
			entry.Error = err.Error()
			res.Failed++
		case out.Created:
			entry.Status = "enqueued"
			entry.JobID = out.JobID
			res.Enqueued++
		default:
			entry.Status = "already_enqueued"
			entry.JobID = out.JobID
			res.AlreadyEnqueued++
		}
		res.Entries = append(res.Entries, entry)
		progress.Set(int64(i+1), int64(len(inRange)), "enqueueing ingest jobs")
	}

	return json.Marshal(res)
}

package job

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"

	gr26config "github.com/gaucho-racing/mapache/gr26/config"
	"github.com/gaucho-racing/mapache/gr26/pkg/foreman"
	"github.com/gaucho-racing/mapache/gr26/pkg/logger"
)

type ingestLatestParams struct {
	VehicleID string `json:"vehicle_id"`
}

// IngestLatestBatchHandler ingests the newest (by S3 LastModified) batch
// for the vehicle, inline. file_ulid lands in the result.
func IngestLatestBatchHandler(ctx context.Context, j foreman.Job, progress *foreman.Progress) (json.RawMessage, error) {
	if gr26config.ShelterS3Bucket == "" {
		return nil, errors.New("shelter ingest configured at foreman but SHELTER_S3_BUCKET is unset")
	}
	var p ingestLatestParams
	if err := json.Unmarshal(j.Params, &p); err != nil {
		return nil, fmt.Errorf("decode params: %w", err)
	}
	if p.VehicleID == "" {
		return nil, errors.New("missing vehicle_id")
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
	if len(objects) == 0 {
		return nil, fmt.Errorf("no batches found for vehicle %s", p.VehicleID)
	}

	sort.Slice(objects, func(i, k int) bool {
		return objects[i].LastModified.After(objects[k].LastModified)
	})
	latest := objects[0]
	fileULID := extractFileULID(latest.Key)
	logger.SugarLogger.Infof("[SHELTER] latest for %s: %s (LastModified=%s)",
		p.VehicleID, fileULID, latest.LastModified)

	res, err := processFile(ctx, client, latest.Key, progress)
	if err != nil {
		return nil, err
	}
	res.FileULID = fileULID
	return json.Marshal(res)
}

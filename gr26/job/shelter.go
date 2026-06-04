package job

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"

	gr26config "github.com/gaucho-racing/mapache/gr26/config"
)

// newS3Client builds an S3 client from the default credential chain +
// configured region. Centralised so every shelter job uses identical
// auth wiring.
func newS3Client(ctx context.Context) (*s3.Client, error) {
	cfg, err := awsconfig.LoadDefaultConfig(ctx,
		awsconfig.WithRegion(gr26config.ShelterS3Region),
	)
	if err != nil {
		return nil, fmt.Errorf("aws config: %w", err)
	}
	return s3.NewFromConfig(cfg), nil
}

// shelterKey returns the canonical S3 key for a given vehicle + file ULID,
// matching the layout TCM-26's shelter/service/upload.py writes to.
func shelterKey(vehicleID, fileULID string) string {
	prefix := strings.TrimRight(gr26config.ShelterS3Prefix, "/")
	return fmt.Sprintf("%s/%s/batch_%s.parquet", prefix, vehicleID, fileULID)
}

// extractFileULID parses the ULID out of a shelter S3 key. Returns the
// empty string if the basename doesn't match the expected
// "batch_<ulid>.parquet" shape — callers should treat that as a skip.
func extractFileULID(key string) string {
	base := key
	if i := strings.LastIndex(base, "/"); i >= 0 {
		base = base[i+1:]
	}
	if !strings.HasPrefix(base, "batch_") || !strings.HasSuffix(base, ".parquet") {
		return ""
	}
	return strings.TrimSuffix(strings.TrimPrefix(base, "batch_"), ".parquet")
}

// shelterObject is the slim subset of an S3 ListObjectsV2 entry the
// shelter jobs care about.
type shelterObject struct {
	Key          string
	LastModified time.Time
	SizeBytes    int64
}

// listShelterObjects pages through ListObjectsV2 under one vehicle's
// shelter prefix and returns every batch_*.parquet object it sees. Non-
// matching entries (e.g. anything not following the batch naming scheme)
// are dropped.
func listShelterObjects(ctx context.Context, client *s3.Client, vehicleID string) ([]shelterObject, error) {
	prefix := strings.TrimRight(gr26config.ShelterS3Prefix, "/") + "/" + vehicleID + "/"
	var out []shelterObject
	var token *string
	for {
		page, err := client.ListObjectsV2(ctx, &s3.ListObjectsV2Input{
			Bucket:            aws.String(gr26config.ShelterS3Bucket),
			Prefix:            aws.String(prefix),
			ContinuationToken: token,
		})
		if err != nil {
			return nil, fmt.Errorf("list: %w", err)
		}
		for _, o := range page.Contents {
			key := aws.ToString(o.Key)
			if extractFileULID(key) == "" {
				continue
			}
			out = append(out, shelterObject{
				Key:          key,
				LastModified: aws.ToTime(o.LastModified),
				SizeBytes:    aws.ToInt64(o.Size),
			})
		}
		if !aws.ToBool(page.IsTruncated) {
			break
		}
		token = page.NextContinuationToken
	}
	return out, nil
}

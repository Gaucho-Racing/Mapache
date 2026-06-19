package config

import (
	"fmt"
	"os"
	"strings"
)

type ServiceInfo struct {
	Name    string
	Version string
}

func (s ServiceInfo) FormattedNameWithVersion() string {
	return fmt.Sprintf("%s v%s", s.Name, s.Version)
}

func (s ServiceInfo) PathPrefix() string {
	return strings.ToLower(s.Name)
}

var Service = ServiceInfo{
	Name:    "GR26",
	Version:     "3.9.1",
}

var SkipAuthCheck = os.Getenv("SKIP_AUTH_CHECK") == "true"
var VehicleUploadKeyCacheTTL = os.Getenv("VEHICLE_UPLOAD_KEY_CACHE_TTL")

var Env = os.Getenv("ENV")
var Port = os.Getenv("PORT")

// Telemetry storage moved off Postgres to ClickHouse (signal, gr26_can,
// ping). gr26 no longer holds any Postgres connection.
var ClickhouseHost = os.Getenv("CLICKHOUSE_HOST")
var ClickhousePort = os.Getenv("CLICKHOUSE_PORT")
var ClickhouseUser = os.Getenv("CLICKHOUSE_USER")
var ClickhousePassword = os.Getenv("CLICKHOUSE_PASSWORD")
var ClickhouseDatabase = os.Getenv("CLICKHOUSE_DATABASE")

// ClickhouseEnabled is the master switch for all CH access (init, writes,
// read endpoints). Unset CLICKHOUSE_HOST means "no ClickHouse" — used by
// the on-car gr26 which has no CH to talk to.
func ClickhouseEnabled() bool { return ClickhouseHost != "" }

var KerbecsEndpoint = os.Getenv("KERBECS_ENDPOINT")
var KerbecsUser = os.Getenv("KERBECS_USER")
var KerbecsPassword = os.Getenv("KERBECS_PASSWORD")

// Foreman is the job queue gr26 enqueues into when it sees events that
// should trigger downstream work (e.g. TCMShelterBatch arriving means
// "go ingest the latest shelter parquet"). Empty endpoint disables the
// enqueue calls entirely so the on-vehicle gr26 stays out of it.
//
// Service-to-service auth was removed for fast iteration; foreman
// endpoints are public. Re-add ForemanToken (and the corresponding
// header in the Foreman client) when locking back down.
var ForemanEndpoint = os.Getenv("FOREMAN_ENDPOINT")

// NumWorkers is the size of the worker pool that claims foreman jobs.
// Each worker runs its own claim loop; goroutine cost is negligible
// (mostly idle on HTTP) but more workers = more concurrent jobs.
var NumWorkersRaw = os.Getenv("NUM_WORKERS")
var NumWorkers int

var MQTTHost = os.Getenv("MQTT_HOST")
var MQTTPort = os.Getenv("MQTT_PORT")
var MQTTUser = os.Getenv("MQTT_USER")
var MQTTPassword = os.Getenv("MQTT_PASSWORD")

// Epic Shelter cold-storage ingest. Driven by foreman jobs now, not by
// polling — SHELTER_S3_BUCKET unset means the IngestBatchHandler
// rejects any job claimed for it. The on-vehicle gr26 leaves this unset.
var ShelterS3Bucket = os.Getenv("SHELTER_S3_BUCKET")
var ShelterS3Region = os.Getenv("SHELTER_S3_REGION")
var ShelterS3Prefix = os.Getenv("SHELTER_S3_PREFIX")

func IsProduction() bool {
	return Env == "PROD"
}

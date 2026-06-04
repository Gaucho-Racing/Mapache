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
	Version: "3.3.0",
}

var SkipAuthCheck = os.Getenv("SKIP_AUTH_CHECK") == "true"
var VehicleUploadKeyCacheTTL = os.Getenv("VEHICLE_UPLOAD_KEY_CACHE_TTL")
var EnableSignalDB = os.Getenv("ENABLE_SIGNAL_DB") != "false"
var EnableSignalWS = os.Getenv("ENABLE_SIGNAL_WS") != "false"

var Env = os.Getenv("ENV")
var Port = os.Getenv("PORT")

var DatabaseHost = os.Getenv("DATABASE_HOST")
var DatabasePort = os.Getenv("DATABASE_PORT")
var DatabaseUser = os.Getenv("DATABASE_USER")
var DatabasePassword = os.Getenv("DATABASE_PASSWORD")
var DatabaseName = os.Getenv("DATABASE_NAME")

var KerbecsEndpoint = os.Getenv("KERBECS_ENDPOINT")
var KerbecsUser = os.Getenv("KERBECS_USER")
var KerbecsPassword = os.Getenv("KERBECS_PASSWORD")

var MQTTHost = os.Getenv("MQTT_HOST")
var MQTTPort = os.Getenv("MQTT_PORT")
var MQTTUser = os.Getenv("MQTT_USER")
var MQTTPassword = os.Getenv("MQTT_PASSWORD")

// Epic Shelter cold-storage ingest. SHELTER_S3_BUCKET unset means the
// feature is off entirely — the on-vehicle gr26 deployment should keep
// it unset and only the cloud gr26 deployment turns it on.
var ShelterS3Bucket = os.Getenv("SHELTER_S3_BUCKET")
var ShelterS3Region = os.Getenv("SHELTER_S3_REGION")
var ShelterS3Prefix = os.Getenv("SHELTER_S3_PREFIX")
var ShelterPollIntervalRaw = os.Getenv("SHELTER_POLL_INTERVAL_SEC")
var ShelterPollIntervalSec int

func IsProduction() bool {
	return Env == "PROD"
}

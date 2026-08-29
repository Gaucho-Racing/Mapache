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
	Name:    "P987",
	Version: "3.10.4",
}

// TopicRoot is the first topic segment the relay publishes under. It is
// also the generation namespace, so it doubles as the table prefix.
const TopicRoot = "p987"

var SkipAuthCheck = os.Getenv("SKIP_AUTH_CHECK") == "true"
var VehicleUploadKeyCacheTTL = os.Getenv("VEHICLE_UPLOAD_KEY_CACHE_TTL")

var Env = os.Getenv("ENV")
var Port = os.Getenv("PORT")

var ClickhouseHost = os.Getenv("CLICKHOUSE_HOST")
var ClickhousePort = os.Getenv("CLICKHOUSE_PORT")
var ClickhouseUser = os.Getenv("CLICKHOUSE_USER")
var ClickhousePassword = os.Getenv("CLICKHOUSE_PASSWORD")
var ClickhouseDatabase = os.Getenv("CLICKHOUSE_DATABASE")

// ClickhouseEnabled is the master switch for all CH access. Unset
// CLICKHOUSE_HOST means "no ClickHouse", which is how the service is run
// when testing the live path against a relay without standing up storage.
func ClickhouseEnabled() bool { return ClickhouseHost != "" }

var KerbecsEndpoint = os.Getenv("KERBECS_ENDPOINT")
var KerbecsUser = os.Getenv("KERBECS_USER")
var KerbecsPassword = os.Getenv("KERBECS_PASSWORD")

var MQTTHost = os.Getenv("MQTT_HOST")
var MQTTPort = os.Getenv("MQTT_PORT")
var MQTTUser = os.Getenv("MQTT_USER")
var MQTTPassword = os.Getenv("MQTT_PASSWORD")

func IsProduction() bool {
	return Env == "PROD"
}

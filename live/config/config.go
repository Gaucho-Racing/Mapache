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
	Name:    "Live",
	Version: "3.4.7",
}

var Env = os.Getenv("ENV")
var Port = os.Getenv("PORT")

var MQTTHost = os.Getenv("MQTT_HOST")
var MQTTPort = os.Getenv("MQTT_PORT")
var MQTTUser = os.Getenv("MQTT_USER")
var MQTTPassword = os.Getenv("MQTT_PASSWORD")

// CacheWindowSec is the ring-buffer retention window in seconds. Sized
// to cover Clickhouse ingestion lag for newly-connecting clients; default
// of 60s comfortably exceeds observed CH lag in practice.
var CacheWindowSecRaw = os.Getenv("CACHE_WINDOW_SEC")
var CacheWindowSec int

func IsProduction() bool {
	return Env == "PROD"
}

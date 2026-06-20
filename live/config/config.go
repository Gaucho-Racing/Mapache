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
	Version:     "3.9.3",
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

// MaxConnections caps concurrent live streams (WS + SSE) per replica.
// New connections over the cap are rejected with 503 so a replica sheds
// load gracefully instead of exhausting goroutines/FDs/memory. Scale total
// capacity by adding replicas (clients round-robin onto any of them).
var MaxConnectionsRaw = os.Getenv("MAX_CONNECTIONS")
var MaxConnections int

// WriteTimeoutSec bounds a single frame write to a client. A consumer that
// stops draining its socket must not pin a writer goroutine forever; once a
// write blocks past this deadline the connection is dropped and its slot
// reclaimed.
var WriteTimeoutSecRaw = os.Getenv("WRITE_TIMEOUT_SEC")
var WriteTimeoutSec int

func IsProduction() bool {
	return Env == "PROD"
}

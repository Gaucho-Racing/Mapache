package config

import (
	"os"
	"strings"

	"github.com/bk1031/rincon-go/v2"
)

var Service rincon.Service = rincon.Service{
	Name:        "GR26",
	Version:     "3.2.0",
	Endpoint:    os.Getenv("SERVICE_ENDPOINT"),
	HealthCheck: os.Getenv("SERVICE_HEALTH_CHECK"),
}

var Routes = []rincon.Route{
	{
		Route:  "/gr26/**",
		Method: "*",
	},
}

var SkipAuthCheck = os.Getenv("SKIP_AUTH_CHECK") == "true"
var VehicleUploadKeyCacheTTL = os.Getenv("VEHICLE_UPLOAD_KEY_CACHE_TTL")
var EnableSignalDB = os.Getenv("ENABLE_SIGNAL_DB") != "false"
var EnableSignalWS = os.Getenv("ENABLE_SIGNAL_WS") != "false"

var Env = os.Getenv("ENV")
var Port = os.Getenv("PORT")
var VehicleID = os.Getenv("VEHICLE_ID")

// VirtualCANPorts is a comma-separated list of UDP ports where on-vehicle
// software services (e.g. shelter) emit synthetic CAN frames. gr26 listens
// on each port and dispatches through the same decoder as the MQTT path —
// no relay, no postgres persistence on the mqtt side, no cloud publish.
var VirtualCANPorts = parsePortList(os.Getenv("VIRTUAL_CAN_PORTS"))

func parsePortList(s string) []string {
	if s == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}

var DatabaseHost = os.Getenv("DATABASE_HOST")
var DatabasePort = os.Getenv("DATABASE_PORT")
var DatabaseUser = os.Getenv("DATABASE_USER")
var DatabasePassword = os.Getenv("DATABASE_PASSWORD")
var DatabaseName = os.Getenv("DATABASE_NAME")

var MQTTHost = os.Getenv("MQTT_HOST")
var MQTTPort = os.Getenv("MQTT_PORT")
var MQTTUser = os.Getenv("MQTT_USER")
var MQTTPassword = os.Getenv("MQTT_PASSWORD")

func IsProduction() bool {
	return Env == "PROD"
}

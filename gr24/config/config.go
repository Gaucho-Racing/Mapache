package config

import (
	"fmt"
	"os"
	"strings"

	"github.com/bk1031/rincon-go"
)

var Service rincon.Service = rincon.Service{
	Name:    "GR24",
	Version: "1.4.5",
}

var Routes = []string{
	fmt.Sprintf("/%s/ping", strings.ToLower(Service.Name)),
	"/ws/gr24/**",
}

var VehicleIDs = []string{
	"gr24-main",
	"testy",
}

var Env = os.Getenv("ENV")
var Port = os.Getenv("PORT")

var MQTTHost = os.Getenv("MQTT_HOST")
var MQTTPort = os.Getenv("MQTT_PORT")
var MQTTUser = os.Getenv("MQTT_USER")
var MQTTPassword = os.Getenv("MQTT_PASSWORD")

var TCMPingInterval = os.Getenv("TCM_PING_INTERVAL")

var DatabaseHost = os.Getenv("DB_HOST")
var DatabasePort = os.Getenv("DB_PORT")
var DatabaseName = os.Getenv("DB_NAME")
var DatabaseUser = os.Getenv("DB_USER")
var DatabasePassword = os.Getenv("DB_PASSWORD")

var RinconClient *rincon.Client
var RinconUser = os.Getenv("RINCON_USER")
var RinconPassword = os.Getenv("RINCON_PASSWORD")

package config

import (
	"fmt"
	"os"
	"strings"

	"github.com/bk1031/rincon-go"
)

var Service rincon.Service = rincon.Service{
	Name:    "Jeddah",
	Version: "1.0.0",
}

var Routes = []string{
	fmt.Sprintf("/%s/ping", strings.ToLower(Service.Name)),
	"/vehicles",
	"/vehicles/**",
	"/trips",
	"/trips/**",
}

var Env = os.Getenv("ENV")
var Port = os.Getenv("PORT")

var DatabaseHost = os.Getenv("DB_HOST")
var DatabasePort = os.Getenv("DB_PORT")
var DatabaseName = os.Getenv("DB_NAME")
var DatabaseUser = os.Getenv("DB_USER")
var DatabasePassword = os.Getenv("DB_PASSWORD")

var RinconClient *rincon.Client
var RinconUser = os.Getenv("RINCON_USER")
var RinconPassword = os.Getenv("RINCON_PASSWORD")

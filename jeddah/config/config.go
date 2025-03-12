package config

import (
	"fmt"
	"os"
	"strings"

	"github.com/bk1031/rincon-go/v2"
)

var Service rincon.Service = rincon.Service{
	Name:    "Jeddah",
	Version: "2.0.0",
}

var Routes = []rincon.Route{
	{
		Route:  fmt.Sprintf("/%s/ping", strings.ToLower(Service.Name)),
		Method: "*",
	},
	{
		Route:  "/vehicles",
		Method: "*",
	},
	{
		Route:  "/vehicles/**",
		Method: "*",
	},
	{
		Route:  "/trips",
		Method: "*",
	},
	{
		Route:  "/trips/**",
		Method: "*",
	},
}

var Env = os.Getenv("ENV")
var Port = os.Getenv("PORT")

var DatabaseHost = os.Getenv("DATABASE_HOST")
var DatabasePort = os.Getenv("DATABASE_PORT")
var DatabaseUser = os.Getenv("DATABASE_USER")
var DatabasePassword = os.Getenv("DATABASE_PASSWORD")
var DatabaseName = os.Getenv("DATABASE_NAME")

var RinconClient *rincon.Client
var RinconUser = os.Getenv("RINCON_USER")
var RinconPassword = os.Getenv("RINCON_PASSWORD")

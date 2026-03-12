package config

import (
	"os"

	"github.com/bk1031/rincon-go/v2"
)

var Service rincon.Service = rincon.Service{
	Name:        "Vehicle",
	Version:     "3.0.0",
	Endpoint:    os.Getenv("SERVICE_ENDPOINT"),
	HealthCheck: os.Getenv("SERVICE_HEALTH_CHECK"),
}

var Routes = []rincon.Route{
	{
		Route:  "/vehicle/ping",
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
		Route:  "/sessions",
		Method: "*",
	},
	{
		Route:  "/sessions/**",
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
var RinconEndpoint = os.Getenv("RINCON_ENDPOINT")

func IsProduction() bool {
	return Env == "PROD"
}

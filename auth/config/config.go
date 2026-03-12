package config

import (
	"os"

	"github.com/bk1031/rincon-go/v2"
)

var Service rincon.Service = rincon.Service{
	Name:        "Auth",
	Version:     "3.0.0",
	Endpoint:    os.Getenv("SERVICE_ENDPOINT"),
	HealthCheck: os.Getenv("SERVICE_HEALTH_CHECK"),
}

var Routes = []rincon.Route{
	{
		Route:  "/auth/**",
		Method: "*",
	},
	{
		Route:  "/users/**",
		Method: "*",
	},
}

var SkipAuthCheck = os.Getenv("SKIP_AUTH_CHECK") == "true"

var Env = os.Getenv("ENV")
var Port = os.Getenv("PORT")

var DatabaseHost = os.Getenv("DATABASE_HOST")
var DatabasePort = os.Getenv("DATABASE_PORT")
var DatabaseUser = os.Getenv("DATABASE_USER")
var DatabasePassword = os.Getenv("DATABASE_PASSWORD")
var DatabaseName = os.Getenv("DATABASE_NAME")

var RinconUser = os.Getenv("RINCON_USER")
var RinconPassword = os.Getenv("RINCON_PASSWORD")
var RinconEndpoint = os.Getenv("RINCON_ENDPOINT")

var Sentinel = struct {
	Url          string
	JwksUrl      string
	ClientID     string
	ClientSecret string
	Token        string
	RedirectURI  string
}{
	Url:          os.Getenv("SENTINEL_URL"),
	JwksUrl:      os.Getenv("SENTINEL_JWKS_URL"),
	ClientID:     os.Getenv("SENTINEL_CLIENT_ID"),
	ClientSecret: os.Getenv("SENTINEL_CLIENT_SECRET"),
	Token:        os.Getenv("SENTINEL_TOKEN"),
	RedirectURI:  os.Getenv("SENTINEL_REDIRECT_URI"),
}

func IsProduction() bool {
	return Env == "PROD"
}

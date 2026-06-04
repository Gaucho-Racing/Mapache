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
	Name:    "Auth",
	Version:     "33.4.2",
}

var SkipAuthCheck = os.Getenv("SKIP_AUTH_CHECK") == "true"

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

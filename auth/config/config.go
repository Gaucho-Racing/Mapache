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
	Version:     "3.9.0",
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

// Sentinel v5 configuration. All endpoints live under SENTINEL_URL with the
// /api/ prefix the kerbecs gateway strips before reaching core/oauth.
//
//   - ClientID / ClientSecret: this app's OAuth client registration in
//     Sentinel. Used for the authorization-code exchange.
//   - SAToken: a pre-issued service-account JWT for backend-only calls
//     (GetAllUsers, GetUserByID) that don't have a logged-in user's
//     bearer. Replaces the v4 SENTINEL_TOKEN static API key.
//   - RedirectURI: must byte-match a registered redirect_uri on the
//     client; the dashboard sends users to this exact URL.
var Sentinel = struct {
	Url          string
	ClientID     string
	ClientSecret string
	SAToken      string
	RedirectURI  string
}{
	Url:          os.Getenv("SENTINEL_URL"),
	ClientID:     os.Getenv("SENTINEL_CLIENT_ID"),
	ClientSecret: os.Getenv("SENTINEL_CLIENT_SECRET"),
	SAToken:      os.Getenv("SENTINEL_SA_TOKEN"),
	RedirectURI:  os.Getenv("SENTINEL_REDIRECT_URI"),
}

// SentinelIssuer is the iss claim Sentinel v5 stamps into every signed
// token. Must byte-match SENTINEL_URL — the issuer is fixed in v5 to
// the public base URL.
const SentinelIssuer = "https://sentinel-v5.gauchoracing.com"

func IsProduction() bool {
	return Env == "PROD"
}

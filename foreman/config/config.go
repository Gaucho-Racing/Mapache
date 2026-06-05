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
	Name:    "Foreman",
	Version:     "3.4.4",
}

// Service-to-service auth was removed for fast iteration; all
// endpoints are public. Re-add SkipAuthCheck / InternalSecret +
// the RequireServiceToken middleware in api/api.go when locking back down.

// ReaperIntervalSec is how often expired leases are swept back to pending.
var ReaperIntervalRaw = os.Getenv("FOREMAN_REAPER_INTERVAL_SEC")
var ReaperIntervalSec int

// DefaultLeaseSec is the lease length applied when a claim omits one.
var DefaultLeaseRaw = os.Getenv("FOREMAN_DEFAULT_LEASE_SEC")
var DefaultLeaseSec int

var Env = os.Getenv("ENV")
var Port = os.Getenv("PORT")

var DatabaseHost = os.Getenv("DATABASE_HOST")
var DatabasePort = os.Getenv("DATABASE_PORT")
var DatabaseUser = os.Getenv("DATABASE_USER")
var DatabasePassword = os.Getenv("DATABASE_PASSWORD")
var DatabaseName = os.Getenv("DATABASE_NAME")

func IsProduction() bool {
	return Env == "PROD"
}

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
	Version: "3.3.0",
}

var SkipAuthCheck = os.Getenv("SKIP_AUTH_CHECK") == "true"

// InternalSecret guards the emitter/worker write endpoints (enqueue,
// claim, heartbeat, complete, fail, cancel, schedule registration).
// Callers present it as the X-Foreman-Token header. Empty + SkipAuthCheck
// is the DEV escape hatch; empty in PROD is rejected at startup.
var InternalSecret = os.Getenv("FOREMAN_INTERNAL_SECRET")

// ReaperIntervalSec is how often expired leases are swept back to pending.
// SchedulerIntervalSec is how often due schedules are enqueued.
var ReaperIntervalRaw = os.Getenv("FOREMAN_REAPER_INTERVAL_SEC")
var ReaperIntervalSec int
var SchedulerIntervalRaw = os.Getenv("FOREMAN_SCHEDULER_INTERVAL_SEC")
var SchedulerIntervalSec int

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

package config

import (
	"os"
)

var Version = "1.2.0"
var Env = os.Getenv("ENV")
var Port = os.Getenv("PORT")

var AuthUser = os.Getenv("AUTH_USER")
var AuthPassword = os.Getenv("AUTH_PASSWORD")

var ServiceIDLength = os.Getenv("SERVICE_ID_LENGTH")

// StorageMode is the mode of storage to use.
// It can be "local", "sql", "redis", "redis+sql".
var StorageMode = os.Getenv("STORAGE_MODE")

// OverwriteRoutes is a flag to determine if routes should be overwritten.
var OverwriteRoutes = os.Getenv("OVERWRITE_ROUTES")

// HeartbeatType is the type of heartbeat to use.
// It can be "server" or "client".
// If "server", Rincon will send heartbeats to the client service
// health check endpoint at the interval specified by HEARTBEAT_INTERVAL.
// If "client", Rincon will expect heartbeats from the client service
// at the interval specified by HEARTBEAT_INTERVAL.
var HeartbeatType = os.Getenv("HEARTBEAT_TYPE")

// HeartbeatInterval is the interval at which heartbeats should be sent.
var HeartbeatInterval = os.Getenv("HEARTBEAT_INTERVAL")

// DatabaseDriver is the driver to use for the database.
// It can be "mysql" or "postgres".
var DatabaseDriver = os.Getenv("DB_DRIVER")
var DatabaseHost = os.Getenv("DB_HOST")
var DatabasePort = os.Getenv("DB_PORT")
var DatabaseName = os.Getenv("DB_NAME")
var DatabaseUser = os.Getenv("DB_USER")
var DatabasePassword = os.Getenv("DB_PASSWORD")
var DatabaseTablePrefix = os.Getenv("DB_TABLE_PREFIX")

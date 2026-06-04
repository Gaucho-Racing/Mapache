package config

import (
	"strconv"

	"github.com/gaucho-racing/mapache/foreman/pkg/logger"
)

func Verify() {
	if Env == "" {
		Env = "PROD"
		logger.SugarLogger.Infof("ENV is not set, defaulting to %s", Env)
	}
	if Port == "" {
		Port = "7011"
		logger.SugarLogger.Infof("PORT is not set, defaulting to %s", Port)
	}
	if DatabaseHost == "" {
		DatabaseHost = "localhost"
		logger.SugarLogger.Infof("DATABASE_HOST is not set, defaulting to %s", DatabaseHost)
	}
	if DatabasePort == "" {
		DatabasePort = "5432"
		logger.SugarLogger.Infof("DATABASE_PORT is not set, defaulting to %s", DatabasePort)
	}
	if DatabaseUser == "" {
		DatabaseUser = "postgres"
		logger.SugarLogger.Infof("DATABASE_USER is not set, defaulting to %s", DatabaseUser)
	}
	if DatabasePassword == "" {
		DatabasePassword = "password"
		logger.SugarLogger.Infof("DATABASE_PASSWORD is not set, defaulting to %s", DatabasePassword)
	}
	if DatabaseName == "" {
		DatabaseName = "mapache"
		logger.SugarLogger.Infof("DATABASE_NAME is not set, defaulting to %s", DatabaseName)
	}

	ReaperIntervalSec = intEnv(ReaperIntervalRaw, "FOREMAN_REAPER_INTERVAL_SEC", 10)
	DefaultLeaseSec = intEnv(DefaultLeaseRaw, "FOREMAN_DEFAULT_LEASE_SEC", 60)
}

func intEnv(raw, name string, def int) int {
	if raw == "" {
		return def
	}
	n, err := strconv.Atoi(raw)
	if err != nil {
		logger.SugarLogger.Errorf("%s=%q is not an int, defaulting to %d", name, raw, def)
		return def
	}
	return n
}

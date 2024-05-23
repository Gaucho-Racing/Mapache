package utils

import (
	"rincon/config"
	"strconv"
)

func VerifyConfig() {
	if config.Env == "" {
		config.Env = "PROD"
		SugarLogger.Debugln("ENV is not set, defaulting to PROD")
	}
	if config.Port == "" {
		config.Port = "10311"
		SugarLogger.Debugln("PORT is not set, defaulting to 10311")
	}
	if config.AuthUser == "" {
		config.AuthUser = "admin"
		SugarLogger.Debugln("AUTH_USER is not set, defaulting to admin")
	}
	if config.AuthPassword == "" {
		config.AuthPassword = "admin"
		SugarLogger.Debugln("AUTH_PASSWORD is not set, defaulting to admin")
	}

	if config.ServiceIDLength == "" {
		config.ServiceIDLength = "6"
		SugarLogger.Debugln("SERVICE_ID_LENGTH is not set, defaulting to 6")
	}
	if i, err := strconv.Atoi(config.ServiceIDLength); i < 4 || err != nil {
		config.ServiceIDLength = "4"
		SugarLogger.Debugln("SERVICE_ID_LENGTH is less than 4, defaulting to 4")
	}
	if config.StorageMode == "sql" {
		verifySql()
	} else if config.StorageMode == "redis" {

	} else if config.StorageMode == "redis+sql" {
		verifySql()
	} else {
		config.StorageMode = "local"
		SugarLogger.Infoln("STORAGE_MODE is not set, defaulting to local")
	}
	if config.OverwriteRoutes == "" {
		config.OverwriteRoutes = "true"
		SugarLogger.Debugln("OVERWRITE_ROUTES is not set, defaulting to true")
	}
	if config.HeartbeatType == "" {
		config.HeartbeatType = "server"
		SugarLogger.Debugln("HEARTBEAT_TYPE is not set, defaulting to server")
	}
	if config.HeartbeatInterval == "" {
		config.HeartbeatInterval = "10"
		SugarLogger.Debugln("HEARTBEAT_INTERVAL is not set, defaulting to 10")
	}
	if config.DatabaseTablePrefix == "" {
		config.DatabaseTablePrefix = "rin_"
		SugarLogger.Debugln("DB_TABLE_PREFIX is not set, defaulting to rin_")
	}
}

func verifySql() {
	if config.DatabaseDriver == "" {
		SugarLogger.Errorln("STORAGE_MODE is set to " + config.StorageMode + " but DB_DRIVER is not set")
	}
	if config.DatabaseHost == "" {
		SugarLogger.Errorln("STORAGE_MODE is set to " + config.StorageMode + " but DB_HOST is not set")
	}
	if config.DatabasePort == "" {
		SugarLogger.Errorln("STORAGE_MODE is set to " + config.StorageMode + " but DB_PORT is not set")
	}
	if config.DatabaseName == "" {
		SugarLogger.Errorln("STORAGE_MODE is set to " + config.StorageMode + " but DB_NAME is not set")
	}
	if config.DatabaseUser == "" {
		SugarLogger.Errorln("STORAGE_MODE is set to " + config.StorageMode + " but DB_USER is not set")
	}
	if config.DatabasePassword == "" {
		SugarLogger.Errorln("STORAGE_MODE is set to " + config.StorageMode + " but DB_PASSWORD is not set")
	}
}

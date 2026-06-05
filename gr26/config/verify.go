package config

import (
	"strconv"

	"github.com/gaucho-racing/mapache/gr26/pkg/logger"
)

func Verify() {
	if Env == "" {
		Env = "PROD"
		logger.SugarLogger.Infof("ENV is not set, defaulting to %s", Env)
	}
	if Port == "" {
		Port = "7005"
		logger.SugarLogger.Infof("PORT is not set, defaulting to %s", Port)
	}
	if !ClickhouseEnabled() {
		logger.SugarLogger.Infoln("CLICKHOUSE_HOST is not set, ClickHouse disabled")
	} else {
		if ClickhousePort == "" {
			ClickhousePort = "9000"
			logger.SugarLogger.Infof("CLICKHOUSE_PORT is not set, defaulting to %s", ClickhousePort)
		}
		if ClickhouseUser == "" {
			ClickhouseUser = "default"
			logger.SugarLogger.Infof("CLICKHOUSE_USER is not set, defaulting to %s", ClickhouseUser)
		}
		if ClickhouseDatabase == "" {
			ClickhouseDatabase = "mapache"
			logger.SugarLogger.Infof("CLICKHOUSE_DATABASE is not set, defaulting to %s", ClickhouseDatabase)
		}
	}
	if MQTTHost == "" {
		MQTTHost = "localhost"
		logger.SugarLogger.Infof("MQTT_HOST is not set, defaulting to %s", MQTTHost)
	}
	if MQTTPort == "" {
		MQTTPort = "1883"
		logger.SugarLogger.Infof("MQTT_PORT is not set, defaulting to %s", MQTTPort)
	}
	if VehicleUploadKeyCacheTTL == "" {
		VehicleUploadKeyCacheTTL = "600"
		logger.SugarLogger.Infof("VEHICLE_UPLOAD_KEY_CACHE_TTL is not set, defaulting to %s", VehicleUploadKeyCacheTTL)
	}
	if NumWorkersRaw == "" {
		NumWorkersRaw = "1"
	}
	if n, err := strconv.Atoi(NumWorkersRaw); err != nil || n < 1 {
		logger.SugarLogger.Errorf("NUM_WORKERS=%q is not a positive int, defaulting to 1", NumWorkersRaw)
		NumWorkers = 1
	} else {
		NumWorkers = n
	}
}

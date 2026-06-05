package config

import (
	"strconv"

	"github.com/gaucho-racing/mapache/live/pkg/logger"
)

func Verify() {
	if Env == "" {
		Env = "PROD"
		logger.SugarLogger.Infof("ENV is not set, defaulting to %s", Env)
	}
	if Port == "" {
		Port = "7015"
		logger.SugarLogger.Infof("PORT is not set, defaulting to %s", Port)
	}
	if MQTTHost == "" {
		MQTTHost = "localhost"
		logger.SugarLogger.Infof("MQTT_HOST is not set, defaulting to %s", MQTTHost)
	}
	if MQTTPort == "" {
		MQTTPort = "1883"
		logger.SugarLogger.Infof("MQTT_PORT is not set, defaulting to %s", MQTTPort)
	}
	if CacheWindowSecRaw == "" {
		CacheWindowSecRaw = "60"
	}
	if n, err := strconv.Atoi(CacheWindowSecRaw); err != nil || n < 1 {
		logger.SugarLogger.Errorf("CACHE_WINDOW_SEC=%q is not a positive int, defaulting to 60", CacheWindowSecRaw)
		CacheWindowSec = 60
	} else {
		CacheWindowSec = n
	}
}

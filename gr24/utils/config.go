package utils

import (
	"gr24/config"
	"strings"
)

func VerifyConfig() {
	if config.Service.Name == "" {
		config.Service.Name = "Bro Didnt Name This Shit"
		SugarLogger.Errorln("Bro didn't name the service 😭")
	}
	config.Service.Name = strings.ToLower(strings.ReplaceAll(config.Service.Name, " ", "_"))
	if config.Env == "" {
		config.Env = "PROD"
		SugarLogger.Infof("ENV is not set, defaulting to %s", config.Env)
	}
	if config.Port == "" {
		config.Port = "7999"
		SugarLogger.Infof("PORT is not set, defaulting to %s", config.Port)
	}
	if config.TCMPingInterval == "" {
		config.TCMPingInterval = "1000"
	}
	if config.DatabaseHost == "" {
		config.DatabaseHost = "localhost"
		SugarLogger.Infof("DB_HOST is not set, defaulting to %s", config.DatabaseHost)
	}
	if config.DatabasePort == "" {
		config.DatabasePort = "3306"
		SugarLogger.Infof("DB_PORT is not set, defaulting to %s", config.DatabasePort)
	}
	if config.DatabaseName == "" {
		config.DatabaseName = "mapache"
		SugarLogger.Infof("DB_NAME is not set, defaulting to %s", config.DatabaseName)
	}
	if config.DatabaseUser == "" {
		config.DatabaseUser = "admin"
		SugarLogger.Infof("DB_USER is not set, defaulting to %s", config.DatabaseUser)
	}
	if config.DatabasePassword == "" {
		config.DatabasePassword = "password"
		SugarLogger.Infof("DB_PASSWORD is not set, defaulting to %s", config.DatabasePassword)
	}
	if config.RinconUser == "" {
		config.RinconUser = "admin"
		SugarLogger.Infof("RINCON_USER is not set, defaulting to %s", config.RinconUser)
	}
	if config.RinconPassword == "" {
		config.RinconPassword = "password"
		SugarLogger.Infof("RINCON_PASSWORD is not set, defaulting to %s", config.RinconPassword)
	}
}

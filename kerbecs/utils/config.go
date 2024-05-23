package utils

import (
	"kerbecs/config"
)

func VerifyConfig() {
	if config.Env == "" {
		config.Env = "PROD"
		SugarLogger.Debugln("ENV is not set, defaulting to PROD")
	}
	if config.Port == "" {
		config.Port = "10310"
		SugarLogger.Debugln("PORT is not set, defaulting to 10311")
	}
	if config.AdminPort == "" {
		config.AdminPort = "10300"
		SugarLogger.Debugln("ADMIN_PORT is not set, defaulting to 10300")
	}
	if config.AdminUser == "" {
		config.AdminUser = "admin"
		SugarLogger.Debugln("ADMIN_USER is not set, defaulting to admin")
	}
	if config.AdminPassword == "" {
		config.AdminPassword = "admin"
		SugarLogger.Debugln("ADMIN_PASSWORD is not set, defaulting to admin")
	}
}

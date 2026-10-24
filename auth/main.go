package main

import (
	"github.com/gaucho-racing/mapache-legacy/auth/api"
	"github.com/gaucho-racing/mapache-legacy/auth/config"
	"github.com/gaucho-racing/mapache-legacy/auth/database"
	"github.com/gaucho-racing/mapache-legacy/auth/pkg/logger"
	"github.com/gaucho-racing/mapache-legacy/auth/service"
)

func main() {
	logger.Init(config.IsProduction())
	defer logger.Logger.Sync()

	config.Verify()
	config.PrintStartupBanner()
	database.Init()
	if config.SkipAuthCheck {
		logger.SugarLogger.Warnln("SKIP_AUTH_CHECK is enabled, skipping Sentinel initialization")
	} else {
		service.InitializeKeys()
		service.PingSentinel()
	}

	api.Run()
}

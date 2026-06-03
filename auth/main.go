package main

import (
	"github.com/gaucho-racing/mapache/auth/api"
	"github.com/gaucho-racing/mapache/auth/config"
	"github.com/gaucho-racing/mapache/auth/database"
	"github.com/gaucho-racing/mapache/auth/pkg/logger"
	"github.com/gaucho-racing/mapache/auth/service"
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

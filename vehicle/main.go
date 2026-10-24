package main

import (
	"github.com/gaucho-racing/mapache-legacy/vehicle/api"
	"github.com/gaucho-racing/mapache-legacy/vehicle/config"
	"github.com/gaucho-racing/mapache-legacy/vehicle/database"
	"github.com/gaucho-racing/mapache-legacy/vehicle/pkg/logger"
)

func main() {
	logger.Init(config.IsProduction())
	defer logger.Logger.Sync()

	config.Verify()
	config.PrintStartupBanner()
	database.Init()

	api.Run()
}

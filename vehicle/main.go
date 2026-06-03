package main

import (
	"github.com/gaucho-racing/mapache/vehicle/api"
	"github.com/gaucho-racing/mapache/vehicle/config"
	"github.com/gaucho-racing/mapache/vehicle/database"
	"github.com/gaucho-racing/mapache/vehicle/pkg/logger"
)

func main() {
	logger.Init(config.IsProduction())
	defer logger.Logger.Sync()

	config.Verify()
	config.PrintStartupBanner()
	database.Init()

	api.Run()
}

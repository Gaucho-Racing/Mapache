package main

import (
	"github.com/gaucho-racing/mapache/foreman/api"
	"github.com/gaucho-racing/mapache/foreman/config"
	"github.com/gaucho-racing/mapache/foreman/database"
	"github.com/gaucho-racing/mapache/foreman/pkg/logger"
	"github.com/gaucho-racing/mapache/foreman/service"
)

func main() {
	logger.Init(config.IsProduction())
	defer logger.Logger.Sync()

	config.Verify()
	config.PrintStartupBanner()
	database.Init()
	service.StartScheduler()
	service.StartReaper()

	api.Run()
}

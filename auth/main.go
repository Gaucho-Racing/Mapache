package main

import (
	"github.com/gaucho-racing/mapache/auth/api"
	"github.com/gaucho-racing/mapache/auth/config"
	"github.com/gaucho-racing/mapache/auth/database"
	"github.com/gaucho-racing/mapache/auth/pkg/logger"
	"github.com/gaucho-racing/mapache/auth/pkg/rincon"
	"github.com/gaucho-racing/mapache/auth/service"
)

func main() {
	logger.Init(config.IsProduction())
	defer logger.Logger.Sync()

	config.Verify()
	config.PrintStartupBanner()
	rincon.Init(&config.Service, &config.Routes)
	database.Init()
	service.InitializeKeys()
	service.PingSentinel()

	api.Run()
}

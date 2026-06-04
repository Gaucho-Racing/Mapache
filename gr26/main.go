package main

import (
	"github.com/gaucho-racing/mapache/gr26/api"
	"github.com/gaucho-racing/mapache/gr26/config"
	"github.com/gaucho-racing/mapache/gr26/database"
	"github.com/gaucho-racing/mapache/gr26/mqtt"
	"github.com/gaucho-racing/mapache/gr26/pkg/kerbecs"
	"github.com/gaucho-racing/mapache/gr26/pkg/logger"
	"github.com/gaucho-racing/mapache/gr26/service"
)

func main() {
	logger.Init(config.IsProduction())
	defer logger.Logger.Sync()

	config.Verify()
	config.PrintStartupBanner()
	kerbecs.Init(config.KerbecsEndpoint, config.KerbecsUser, config.KerbecsPassword)
	database.Init()
	mqtt.Init(service.SubscribeTopics)
	service.StartShelterIngest()

	api.Run()
}

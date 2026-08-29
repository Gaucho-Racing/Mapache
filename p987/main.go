package main

import (
	"context"

	"github.com/gaucho-racing/mapache/p987/api"
	"github.com/gaucho-racing/mapache/p987/config"
	"github.com/gaucho-racing/mapache/p987/database"
	"github.com/gaucho-racing/mapache/p987/mqtt"
	"github.com/gaucho-racing/mapache/p987/pkg/kerbecs"
	"github.com/gaucho-racing/mapache/p987/pkg/logger"
	"github.com/gaucho-racing/mapache/p987/service"
)

func main() {
	logger.Init(config.IsProduction())
	defer logger.Logger.Sync()

	config.Verify()
	config.PrintStartupBanner()
	kerbecs.Init(config.KerbecsEndpoint, config.KerbecsUser, config.KerbecsPassword)
	if config.ClickhouseEnabled() {
		database.Init()
	}

	// Parse the DBC before subscribing so the first frame doesn't race the
	// load, and so a malformed file fails at startup rather than silently
	// decoding nothing.
	if err := service.InitDecoder(); err != nil {
		logger.SugarLogger.Fatalf("Failed to load DBC: %v", err)
	}

	mqtt.SetMessageHandler(service.HandleInboundMessage)
	if err := mqtt.Init(context.Background()); err != nil {
		logger.SugarLogger.Fatalf("Failed to initialize MQTT: %v", err)
	}

	api.Run()
}

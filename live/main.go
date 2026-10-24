package main

import (
	"context"
	"time"

	"github.com/gaucho-racing/mapache-legacy/live/api"
	"github.com/gaucho-racing/mapache-legacy/live/config"
	"github.com/gaucho-racing/mapache-legacy/live/mqtt"
	"github.com/gaucho-racing/mapache-legacy/live/pkg/logger"
	"github.com/gaucho-racing/mapache-legacy/live/service"
)

func main() {
	logger.Init(config.IsProduction())
	defer logger.Logger.Sync()

	config.Verify()
	config.PrintStartupBanner()

	service.InitCache(time.Duration(config.CacheWindowSec) * time.Second)

	// Wire handler before mqtt.Init so we never miss the first frame.
	mqtt.SetMessageHandler(service.HandleInboundMessage)
	if err := mqtt.Init(context.Background()); err != nil {
		logger.SugarLogger.Fatalf("Failed to initialize MQTT: %v", err)
	}

	api.Run()
}

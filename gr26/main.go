package main

import (
	"context"

	"github.com/gaucho-racing/mapache/gr26/api"
	"github.com/gaucho-racing/mapache/gr26/config"
	"github.com/gaucho-racing/mapache/gr26/database"
	"github.com/gaucho-racing/mapache/gr26/job"
	"github.com/gaucho-racing/mapache/gr26/mqtt"
	"github.com/gaucho-racing/mapache/gr26/pkg/kerbecs"
	"github.com/gaucho-racing/mapache/gr26/pkg/logger"
	"github.com/gaucho-racing/mapache/gr26/service"
	"github.com/gaucho-racing/mapache/gr26/worker"
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

	// Wire hook + handler before mqtt.Init so neither races the first frame.
	service.ShelterBatchHook = job.OnShelterBatchReceived
	mqtt.SetMessageHandler(service.HandleInboundMessage)
	if err := mqtt.Init(context.Background()); err != nil {
		logger.SugarLogger.Fatalf("Failed to initialize MQTT: %v", err)
	}

	reg := worker.NewRegistry()
	reg.Register("gr26.ingest_batch", job.IngestBatchHandler)
	reg.Register("gr26.ingest_latest_batch", job.IngestLatestBatchHandler)
	reg.Register("gr26.ingest_all_batches", job.IngestAllBatchesHandler)
	worker.StartPool(context.Background(), reg)

	api.Run()
}

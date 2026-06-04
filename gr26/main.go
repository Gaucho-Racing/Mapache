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
	database.Init()

	// Wire the service-level side-channel hook into the job module. Has
	// to happen before MQTT.Init so the hook is set by the time the
	// subscriber callback starts firing.
	service.ShelterBatchHook = job.OnShelterBatchReceived

	mqtt.Init(service.SubscribeTopics)

	reg := worker.NewRegistry()
	reg.Register("gr26.ingest_batch", job.IngestBatchHandler)
	worker.StartPool(context.Background(), reg)

	api.Run()
}

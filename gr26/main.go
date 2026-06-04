package main

import (
	"context"

	"github.com/gaucho-racing/mapache/gr26/api"
	"github.com/gaucho-racing/mapache/gr26/config"
	"github.com/gaucho-racing/mapache/gr26/database"
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
	mqtt.Init(service.SubscribeTopics)

	// Worker pool: foreman gives us jobs, we run them. Currently just
	// gr26.ingest_latest_batch but adding more is a Register call.
	reg := worker.NewRegistry()
	reg.Register("gr26.ingest_latest_batch", service.IngestLatestBatchHandler)
	worker.StartPool(context.Background(), reg)

	api.Run()
}

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
	// Skip ClickHouse entirely when ENABLE_SIGNAL_DB=false (the on-car
	// gr26 has no ClickHouse to talk to). Writes/reads also short-circuit
	// on this flag so any code path that would have used database.Conn
	// is a no-op (writes) or returns 503 (reads).
	if config.EnableSignalDB {
		database.Init()
	} else {
		logger.SugarLogger.Infoln("ClickHouse disabled (ENABLE_SIGNAL_DB=false), skipping database.Init")
	}

	// Wire the service-level side-channel hook into the job module. Has
	// to happen before MQTT.Init so the hook is set by the time the
	// subscriber callback starts firing.
	service.ShelterBatchHook = job.OnShelterBatchReceived

	// SetMessageHandler must run before Init so the OnConnectionUp
	// subscribe doesn't race against the first arriving frames.
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

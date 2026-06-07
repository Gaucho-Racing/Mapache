package main

import (
	"context"
	"fmt"
	"os"

	"github.com/gaucho-racing/mapache/gr26/api"
	"github.com/gaucho-racing/mapache/gr26/config"
	"github.com/gaucho-racing/mapache/gr26/database"
	"github.com/gaucho-racing/mapache/gr26/job"
	"github.com/gaucho-racing/mapache/gr26/mqtt"
	"github.com/gaucho-racing/mapache/gr26/pkg/foreman"
	"github.com/gaucho-racing/mapache/gr26/pkg/kerbecs"
	"github.com/gaucho-racing/mapache/gr26/pkg/logger"
	"github.com/gaucho-racing/mapache/gr26/service"
)

func main() {
	logger.Init(config.IsProduction())
	defer logger.Logger.Sync()

	config.Verify()
	config.PrintStartupBanner()
	foreman.Init()
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

	startWorkerPool(context.Background())

	api.Run()
}

// startWorkerPool spawns config.NumWorkers foreman.Worker goroutines.
// Each Worker handles one job at a time; multiple Workers give us
// horizontal concurrency within the process — and the server's
// SELECT … FOR UPDATE SKIP LOCKED guarantees no two of them grab the
// same job. No-op when FOREMAN_ENDPOINT is unset (the on-vehicle gr26
// deployment stays out of Foreman entirely).
func startWorkerPool(ctx context.Context) {
	if config.ForemanEndpoint == "" {
		logger.SugarLogger.Infoln("[WORKER] pool disabled (FOREMAN_ENDPOINT unset)")
		return
	}
	n := config.NumWorkers
	if n < 1 {
		n = 1
	}
	host := hostname()
	logger.SugarLogger.Infof("[WORKER] starting pool of %d workers", n)
	for i := 0; i < n; i++ {
		w := &foreman.Worker{
			Client:   foreman.Default,
			WorkerID: fmt.Sprintf("gr26-%s-%d", host, i),
			LeaseSec: 60,
			OnError: func(err error) {
				logger.SugarLogger.Warnf("[WORKER] %v", err)
			},
		}
		w.Handle("gr26.ingest_batch", job.IngestBatchHandler)
		w.Handle("gr26.ingest_latest_batch", job.IngestLatestBatchHandler)
		w.Handle("gr26.ingest_all_batches", job.IngestAllBatchesHandler)
		go func() {
			if err := w.Run(ctx); err != nil {
				logger.SugarLogger.Errorf("[WORKER] run exited: %v", err)
			}
		}()
	}
}

// hostname returns the container hostname, falling back to "gr26" so
// worker IDs stay stable-ish if Hostname() fails (e.g. in tests).
func hostname() string {
	h, err := os.Hostname()
	if err != nil || h == "" {
		return "gr26"
	}
	return h
}

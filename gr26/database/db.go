package database

import (
	"context"
	"fmt"
	"time"

	"github.com/gaucho-racing/mapache/gr26/config"
	"github.com/gaucho-racing/mapache/gr26/pkg/logger"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	mapache "github.com/gaucho-racing/mapache/mapache-go/v3"
)

// Conn is the shared ClickHouse connection. Telemetry (signal, gr26_can,
// ping) lives in ClickHouse now; gr26 holds no Postgres connection.
var Conn driver.Conn

var dbRetries = 0

func options(database string) *clickhouse.Options {
	return &clickhouse.Options{
		Addr: []string{fmt.Sprintf("%s:%s", config.ClickhouseHost, config.ClickhousePort)},
		Auth: clickhouse.Auth{
			Database: database,
			Username: config.ClickhouseUser,
			Password: config.ClickhousePassword,
		},
		DialTimeout: 10 * time.Second,
	}
}

// InsertCtx returns a context that flags inserts as server-side async:
// gr26 fires many small INSERTs and lets ClickHouse coalesce them into
// larger parts rather than batching client-side. wait_for_async_insert=0
// means we don't block on the flush — an acceptable loss window for
// high-rate telemetry (see plan tradeoffs).
func InsertCtx(parent context.Context) context.Context {
	return clickhouse.Context(parent, clickhouse.WithSettings(clickhouse.Settings{
		"async_insert":          1,
		"wait_for_async_insert": 0,
	}))
}

func Init() {
	if err := connect(); err != nil {
		if dbRetries < 5 {
			dbRetries++
			logger.SugarLogger.Errorln("failed to connect clickhouse, retrying in 5s... ", err)
			time.Sleep(time.Second * 5)
			Init()
			return
		}
		logger.SugarLogger.Fatalf("failed to connect clickhouse after 5 attempts: %v", err)
	}
}

func connect() error {
	ctx := context.Background()

	// Ensure the target database exists before opening the app connection
	// against it, bootstrapping through the always-present "default" db.
	bootstrap, err := clickhouse.Open(options("default"))
	if err != nil {
		return err
	}
	if err := bootstrap.Exec(ctx, fmt.Sprintf("CREATE DATABASE IF NOT EXISTS %s", config.ClickhouseDatabase)); err != nil {
		bootstrap.Close()
		return err
	}
	bootstrap.Close()

	conn, err := clickhouse.Open(options(config.ClickhouseDatabase))
	if err != nil {
		return err
	}
	if err := conn.Ping(ctx); err != nil {
		conn.Close()
		return err
	}
	if err := migrate(ctx, conn); err != nil {
		conn.Close()
		return err
	}
	logger.SugarLogger.Infoln("Connected to ClickHouse")
	Conn = conn
	return nil
}

func migrate(ctx context.Context, conn driver.Conn) error {
	for _, stmt := range []string{mapache.SignalClickHouseDDL, canDDL, mapache.PingClickHouseDDL} {
		if err := conn.Exec(ctx, stmt); err != nil {
			return err
		}
	}
	logger.SugarLogger.Infoln("ClickHouse migration complete")
	return nil
}

// gr26_can has no shared mapache-go model (the CAN frame layout is
// gr26-specific), so its DDL stays here. signal/ping DDL live on the shared
// mapache.Signal / mapache.Ping types.
const canDDL = `
CREATE TABLE IF NOT EXISTS gr26_can (
	id          String CODEC(ZSTD(1)),

	vehicle_id  LowCardinality(String),

	node_id     LowCardinality(String),

	timestamp   Int64 CODEC(Delta, ZSTD(1)),

	can_id      Int32 CODEC(T64, ZSTD(1)),

	bytes       String CODEC(ZSTD(1)),

	upload_key  Int32 CODEC(T64, ZSTD(1)),

	metadata    String CODEC(ZSTD(1)),

	produced_at DateTime64(6, 'UTC')
		MATERIALIZED fromUnixTimestamp64Micro(timestamp)
		CODEC(Delta, ZSTD(1)),

	created_at  DateTime64(6, 'UTC')
		DEFAULT now64(6)
		CODEC(Delta, ZSTD(1)),

	INDEX idx_id id TYPE bloom_filter GRANULARITY 4
)
ENGINE = ReplacingMergeTree(created_at)
PARTITION BY toYYYYMM(produced_at)
ORDER BY (vehicle_id, timestamp, node_id, can_id)`

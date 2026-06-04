package database

import (
	"context"
	"fmt"
	"time"

	"github.com/gaucho-racing/mapache/gr26/config"
	"github.com/gaucho-racing/mapache/gr26/pkg/logger"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
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
	for _, stmt := range []string{signalDDL, canDDL, pingDDL} {
		if err := conn.Exec(ctx, stmt); err != nil {
			return err
		}
	}
	logger.SugarLogger.Infoln("ClickHouse migration complete")
	return nil
}

// produced_at is derived from the event timestamp (unix micros) so the
// ingest path never writes it directly. created_at is the insert wall
// clock and serves as the ReplacingMergeTree version: a later write
// (retransmit, corrected decode, cold-storage replay) wins on merge,
// matching the old Postgres ON CONFLICT ... DO UPDATE semantics.
const signalDDL = `
CREATE TABLE IF NOT EXISTS signal (
	id          String,
	timestamp   Int64,
	vehicle_id  LowCardinality(String),
	name        LowCardinality(String),
	value       Float64,
	raw_value   Int64,
	produced_at DateTime64(6, 'UTC') MATERIALIZED toDateTime64(timestamp / 1e6, 6, 'UTC'),
	created_at  DateTime64(6, 'UTC') DEFAULT now64(6),
	INDEX idx_id id TYPE bloom_filter GRANULARITY 4
) ENGINE = ReplacingMergeTree(created_at)
PARTITION BY toYYYYMM(produced_at)
ORDER BY (vehicle_id, name, timestamp)`

const canDDL = `
CREATE TABLE IF NOT EXISTS gr26_can (
	id          String,
	vehicle_id  LowCardinality(String),
	node_id     LowCardinality(String),
	timestamp   Int64,
	can_id      Int32,
	bytes       String,
	upload_key  Int32,
	metadata    String,
	produced_at DateTime64(6, 'UTC') MATERIALIZED toDateTime64(timestamp / 1e6, 6, 'UTC'),
	created_at  DateTime64(6, 'UTC') DEFAULT now64(6),
	INDEX idx_id id TYPE bloom_filter GRANULARITY 4
) ENGINE = ReplacingMergeTree(created_at)
PARTITION BY toYYYYMM(produced_at)
ORDER BY (vehicle_id, node_id, timestamp)`

const pingDDL = `
CREATE TABLE IF NOT EXISTS ping (
	vehicle_id LowCardinality(String),
	ping       Int64,
	pong       Int64,
	latency    Int32,
	created_at DateTime64(6, 'UTC') DEFAULT now64(6)
) ENGINE = ReplacingMergeTree(created_at)
ORDER BY (vehicle_id, ping)`

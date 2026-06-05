package mapache

// Ping is a type to represent a ping between the vehicle and the server.
// Note that only the uplink latency is saved on the server. The vehicle does receive pongs,
// so it may choose to record the round trip time if it desires.
type Ping struct {
	// VehicleID is the unique identifier for the vehicle that sent the ping.
	VehicleID string `json:"vehicle_id" gorm:"primaryKey"`
	// Ping is the unix millis when the vehicle sent the ping.
	Ping int `json:"ping" gorm:"primaryKey"`
	// Pong is the unix millis when the vehicle received the ping.
	Pong int `json:"pong"`
	// Latency is the latency of the ping in milliseconds.
	Latency int `json:"latency"`
}

func (Ping) TableName() string {
	return "ping"
}

// PingClickHouseDDL is the ClickHouse table definition for Ping, shared by
// every service that writes or migrates the ping table.
//
// Optimized for bursty vehicle telemetry where the dominant read pattern is:
//   vehicle_id + ping time window.
//
// Dedup identity is logically (vehicle_id, ping), but this table does not use
// ReplacingMergeTree because pings are append-only and not backfilled/corrected.
const PingClickHouseDDL = `
CREATE TABLE IF NOT EXISTS ping (
    vehicle_id LowCardinality(String),

    ping       Int64 CODEC(Delta, ZSTD(1)),

    pong       Int64 CODEC(Delta, ZSTD(1)),

    latency    Int32 CODEC(T64, ZSTD(1)),

    ping_at    DateTime64(6, 'UTC')
        MATERIALIZED fromUnixTimestamp64Micro(ping)
        CODEC(Delta, ZSTD(1))
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(ping_at)
ORDER BY (vehicle_id, ping)`

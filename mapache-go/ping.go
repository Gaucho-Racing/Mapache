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
// every service that writes or migrates the ping table. The dedup key
// (vehicle_id, ping) mirrors the gorm primary key above; created_at is the
// ReplacingMergeTree version column so a retransmitted ping collapses on
// merge.
const PingClickHouseDDL = `
CREATE TABLE IF NOT EXISTS ping (
	vehicle_id LowCardinality(String),
	ping       Int64,
	pong       Int64,
	latency    Int32,
	created_at DateTime64(6, 'UTC') DEFAULT now64(6)
) ENGINE = ReplacingMergeTree(created_at)
ORDER BY (vehicle_id, ping)`

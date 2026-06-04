package mapache

import (
	"time"
)

// SignMode is a type to represent whether an integer is signed or unsigned.
type SignMode int

const (
	Signed   SignMode = 1
	Unsigned SignMode = 0
)

// Endian is a type to represent whether an integer is big endian or little endian.
type Endian int

const (
	BigEndian    Endian = 1
	LittleEndian Endian = 0
)

// Signal is a type to represent an individual signal coming from the vehicle.
// This can be something like a sensor reading, a boolean flag, or a status code.
// Timestamp, VehicleID, and Name are together used to uniquely identify a signal row entry.
type Signal struct {
	ID         string    `json:"id" gorm:"primaryKey"`
	Timestamp  int       `json:"timestamp" gorm:"uniqueIndex:idx_signal_unique"`
	VehicleID  string    `json:"vehicle_id" gorm:"uniqueIndex:idx_signal_unique"`
	Name       string    `json:"name" gorm:"uniqueIndex:idx_signal_unique"`
	Value      float64   `json:"value"`
	RawValue   int       `json:"raw_value"`
	ProducedAt time.Time `json:"produced_at" gorm:"precision:6"`
	CreatedAt  time.Time `json:"created_at" gorm:"autoCreateTime;precision:6"`
}

func (Signal) TableName() string {
	return "signal"
}

// SignalClickHouseDDL is the ClickHouse table definition for Signal, shared
// by every service that writes or migrates the signal table. The dedup key
// (vehicle_id, name, timestamp) mirrors the gorm uniqueIndex above;
// produced_at is derived from timestamp so it is never written directly, and
// created_at is the ReplacingMergeTree version column so a later write
// (retransmit, corrected decode, replay) wins on merge.
const SignalClickHouseDDL = `
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

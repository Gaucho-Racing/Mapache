package service

import (
	"context"
	"fmt"
	"time"

	"github.com/gaucho-racing/mapache/p987/config"
	"github.com/gaucho-racing/mapache/p987/database"

	mapache "github.com/gaucho-racing/mapache/mapache-go/v3"
	ulid "github.com/gaucho-racing/ulid-go"
)

// produced_at is MATERIALIZED from timestamp; created_at defaults to insert
// wall clock and acts as the ReplacingMergeTree version. Both omitted here.
const insertSignalSQL = `INSERT INTO signal (id, timestamp, vehicle_id, name, value, raw_value)`

func CreateSignals(signals []mapache.Signal) error {
	if len(signals) == 0 {
		return nil
	}
	// Stamp CreatedAt locally before any MQTT publish or CH insert so
	// downstream consumers (live cache eviction, SSE Last-Event-ID) have
	// a reliable wall-clock anchor independent of producer/CAN-frame clock
	// skew. The CH insert omits the column so the server-side now64(6)
	// default still wins for the persisted row.
	now := time.Now().UTC()
	for i := range signals {
		if signals[i].Timestamp == 0 {
			return fmt.Errorf("signal timestamp cannot be 0")
		}
		if signals[i].VehicleID == "" {
			return fmt.Errorf("signal vehicle id cannot be empty")
		}
		if signals[i].Name == "" {
			return fmt.Errorf("signal name cannot be empty")
		}
		signals[i].ID = ulid.Make().Prefixed("sgnl")
		signals[i].CreatedAt = now
	}
	if !config.ClickhouseEnabled() {
		return nil
	}
	// One buffered block insert per call — a single round trip regardless of
	// signal count, which matters with CH ~25ms away from foundry. async_insert
	// (InsertCtx) doesn't apply to native block inserts, so plain ctx here.
	batch, err := database.Conn.PrepareBatch(context.Background(), insertSignalSQL)
	if err != nil {
		return err
	}
	defer batch.Close()
	for _, s := range signals {
		if err := batch.Append(s.ID, int64(s.Timestamp), s.VehicleID, s.Name, s.Value, int64(s.RawValue)); err != nil {
			return err
		}
	}
	return batch.Send()
}

package service

import (
	"context"
	"fmt"

	"github.com/gaucho-racing/mapache/gr26/config"
	"github.com/gaucho-racing/mapache/gr26/database"

	mapache "github.com/gaucho-racing/mapache/mapache-go/v3"
	ulid "github.com/gaucho-racing/ulid-go"
)

// CreateSignals writes decoded signals to ClickHouse. WebSocket publishing
// lives in HandleMessage so the published payload can carry the
// can_message_id alongside the signal.
//
// produced_at and created_at are omitted from the insert: produced_at is a
// MATERIALIZED column derived from timestamp, and created_at defaults to
// the insert wall clock and acts as the ReplacingMergeTree version (latest
// write wins on merge), so retransmits and corrected decodes dedup
// naturally without an explicit ON CONFLICT.
const insertSignalSQL = `INSERT INTO signal (id, timestamp, vehicle_id, name, value, raw_value) VALUES (?, ?, ?, ?, ?, ?)`

func CreateSignals(signals []mapache.Signal) error {
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
	}
	if !config.EnableSignalDB {
		return nil
	}
	ctx := database.InsertCtx(context.Background())
	for _, s := range signals {
		if err := database.Conn.Exec(ctx, insertSignalSQL,
			s.ID, int64(s.Timestamp), s.VehicleID, s.Name, s.Value, int64(s.RawValue),
		); err != nil {
			return err
		}
	}
	return nil
}

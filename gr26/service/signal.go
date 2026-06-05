package service

import (
	"context"
	"fmt"

	"github.com/gaucho-racing/mapache/gr26/config"
	"github.com/gaucho-racing/mapache/gr26/database"

	mapache "github.com/gaucho-racing/mapache/mapache-go/v3"
	ulid "github.com/gaucho-racing/ulid-go"
)

// produced_at is MATERIALIZED from timestamp; created_at defaults to insert
// wall clock and acts as the ReplacingMergeTree version. Both omitted here.
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
	if !config.ClickhouseEnabled() {
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

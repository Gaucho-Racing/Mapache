package service

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/gaucho-racing/mapache/gr26/config"
	"github.com/gaucho-racing/mapache/gr26/database"
	"github.com/gaucho-racing/mapache/gr26/model"

	mapache "github.com/gaucho-racing/mapache/mapache-go/v3"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	ulid "github.com/gaucho-racing/ulid-go"
)

// ErrNotFound is mapped to 404 by the API layer.
var ErrNotFound = errors.New("record not found")

// MATERIALIZED columns are excluded from SELECT *, so we list explicitly.
const canColumns = `id, vehicle_id, node_id, timestamp, can_id, bytes, upload_key, metadata, produced_at, created_at`
const canColumnsC = `c.id, c.vehicle_id, c.node_id, c.timestamp, c.can_id, c.bytes, c.upload_key, c.metadata, c.produced_at, c.created_at`

// GetCAN looks up a stored CAN frame by ulid.
func GetCAN(id string) (model.CAN, error) {
	row := database.Conn.QueryRow(context.Background(),
		"SELECT "+canColumns+" FROM gr26_can FINAL WHERE id = ? LIMIT 1", id)
	return scanCANRow(row)
}

// GetCANForSignal joins back to the source CAN frame using the signal
// name's `<node>_<short>` prefix to recover node_id.
func GetCANForSignal(signalID string) (model.CAN, error) {
	row := database.Conn.QueryRow(context.Background(), `
		SELECT `+canColumnsC+`
		FROM gr26_can AS c FINAL
		INNER JOIN (
			SELECT vehicle_id, timestamp, splitByChar('_', name)[1] AS node_id
			FROM signal FINAL WHERE id = ?
		) AS s
		ON c.vehicle_id = s.vehicle_id AND c.timestamp = s.timestamp AND c.node_id = s.node_id
		LIMIT 1`, signalID)
	return scanCANRow(row)
}

// GetSignalsForCAN returns every signal decoded from the given frame,
// ordered by name for a stable response.
func GetSignalsForCAN(canMessageID string) ([]mapache.Signal, error) {
	rows, err := database.Conn.Query(context.Background(), `
		SELECT s.id, s.timestamp, s.vehicle_id, s.name, s.value, s.raw_value, s.produced_at, s.created_at
		FROM signal AS s FINAL
		INNER JOIN (
			SELECT vehicle_id, timestamp, node_id FROM gr26_can FINAL WHERE id = ?
		) AS c
		ON s.vehicle_id = c.vehicle_id AND s.timestamp = c.timestamp AND splitByChar('_', s.name)[1] = c.node_id
		ORDER BY s.name ASC`, canMessageID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var signals []mapache.Signal
	for rows.Next() {
		var (
			id, vehicleID, name        string
			ts, rawValue               int64
			value                      float64
			producedAt, createdAt      time.Time
		)
		if err := rows.Scan(&id, &ts, &vehicleID, &name, &value, &rawValue, &producedAt, &createdAt); err != nil {
			return nil, err
		}
		signals = append(signals, mapache.Signal{
			ID:         id,
			Timestamp:  int(ts),
			VehicleID:  vehicleID,
			Name:       name,
			Value:      value,
			RawValue:   int(rawValue),
			ProducedAt: producedAt,
			CreatedAt:  createdAt,
		})
	}
	return signals, rows.Err()
}

// Dedup on (vehicle_id, node_id, timestamp) is handled by the
// ReplacingMergeTree engine — latest created_at wins on merge.
const insertCANSQL = `INSERT INTO gr26_can (id, vehicle_id, node_id, timestamp, can_id, bytes, upload_key, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`

func CreateCAN(can model.CAN) (model.CAN, error) {
	can.ID = ulid.Make().Prefixed("can")
	if !config.EnableSignalDB {
		return can, nil
	}
	ctx := database.InsertCtx(context.Background())
	if err := database.Conn.Exec(ctx, insertCANSQL,
		can.ID, can.VehicleID, can.NodeID, int64(can.Timestamp), int32(can.CANID),
		string(can.Bytes), int32(can.UploadKey), string(can.Metadata),
	); err != nil {
		return model.CAN{}, err
	}
	return can, nil
}

func scanCANRow(row driver.Row) (model.CAN, error) {
	var (
		id, vehicleID, nodeID string
		bytesStr, metaStr     string
		ts                    int64
		canID, uploadKey      int32
		producedAt, createdAt time.Time
	)
	if err := row.Scan(&id, &vehicleID, &nodeID, &ts, &canID, &bytesStr, &uploadKey, &metaStr, &producedAt, &createdAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return model.CAN{}, ErrNotFound
		}
		return model.CAN{}, err
	}
	return model.CAN{
		ID:         id,
		VehicleID:  vehicleID,
		NodeID:     nodeID,
		Timestamp:  int(ts),
		CANID:      int(canID),
		Bytes:      []byte(bytesStr),
		UploadKey:  int(uploadKey),
		Metadata:   []byte(metaStr),
		ProducedAt: producedAt,
		CreatedAt:  createdAt,
	}, nil
}

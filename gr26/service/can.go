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

// ErrNotFound is returned by the lookup helpers when no row matches. The
// API layer maps it to a 404. (Replaces gorm.ErrRecordNotFound now that
// gr26 reads from ClickHouse.)
var ErrNotFound = errors.New("record not found")

const canColumns = `id, vehicle_id, node_id, timestamp, can_id, bytes, upload_key, metadata, produced_at, created_at`

// MATERIALIZED columns (produced_at) are excluded from `SELECT *`, so the
// trace lookups list columns explicitly. canColumnsC is the same list
// qualified to the join alias `c`.
const canColumnsC = `c.id, c.vehicle_id, c.node_id, c.timestamp, c.can_id, c.bytes, c.upload_key, c.metadata, c.produced_at, c.created_at`

// GetCAN looks up a stored CAN frame by its ulid. Returns ErrNotFound if
// no row matches.
func GetCAN(id string) (model.CAN, error) {
	row := database.Conn.QueryRow(context.Background(),
		"SELECT "+canColumns+" FROM gr26_can FINAL WHERE id = ? LIMIT 1", id)
	return scanCANRow(row)
}

// GetCANForSignal looks up the CAN frame that produced a given signal by
// joining on the natural keys (vehicle_id, timestamp, node_id) — node_id
// is recovered from the signal name's prefix, since CreateSignals stamps
// each signal with the node it was decoded from as `<node>_<short>`.
// Returns ErrNotFound if no frame matches (e.g. the source frame was never
// persisted, or the signal name doesn't follow the node-prefix convention).
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

// GetSignalsForCAN returns every signal that was decoded from the given
// CAN frame, joining on the natural keys (vehicle_id, timestamp, node_id).
// Ordered by signal name so the response is stable and easy to scan.
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

// CreateCAN inserts a CAN frame and returns it with the generated id
// populated. Dedup on (vehicle_id, node_id, timestamp) is handled by the
// ReplacingMergeTree engine (latest created_at wins on merge), so no
// explicit conflict handling is needed.
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

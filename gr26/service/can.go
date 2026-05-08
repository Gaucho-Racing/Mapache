package service

import (
	"github.com/gaucho-racing/mapache/gr26/database"
	"github.com/gaucho-racing/mapache/gr26/model"

	ulid "github.com/gaucho-racing/ulid-go"
	"gorm.io/gorm/clause"
)

// CreateCAN inserts (or upserts) a CAN frame record and returns it with
// the stored id populated. Conflicts on (vehicle_id, node_id, timestamp)
// update the payload columns and leave the id stable.
func CreateCAN(can model.CAN) (model.CAN, error) {
	can.ID = ulid.Make().Prefixed("can")
	result := database.DB.Clauses(clause.OnConflict{
		Columns: []clause.Column{
			{Name: "vehicle_id"},
			{Name: "node_id"},
			{Name: "timestamp"},
		},
		DoUpdates: clause.AssignmentColumns([]string{"can_id", "bytes", "upload_key", "metadata", "produced_at"}),
	}, clause.Returning{Columns: []clause.Column{{Name: "id"}}}).Create(&can)
	if result.Error != nil {
		return model.CAN{}, result.Error
	}
	return can, nil
}

// CreateCANSignals links each signal id to the CAN frame it was decoded
// from. Conflicts on signal_id update the can_message_id so the link
// always points at the most recent frame that produced the signal.
func CreateCANSignals(canMessageID string, signalIDs []string) error {
	if len(signalIDs) == 0 {
		return nil
	}
	rows := make([]model.CANSignal, len(signalIDs))
	for i, sid := range signalIDs {
		rows[i] = model.CANSignal{
			SignalID:     sid,
			CANMessageID: canMessageID,
		}
	}
	result := database.DB.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "signal_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"can_message_id"}),
	}).Create(&rows)
	return result.Error
}

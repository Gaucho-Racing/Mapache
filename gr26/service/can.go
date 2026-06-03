package service

import (
	"github.com/gaucho-racing/mapache/gr26/config"
	"github.com/gaucho-racing/mapache/gr26/database"
	"github.com/gaucho-racing/mapache/gr26/model"

	mapache "github.com/gaucho-racing/mapache/mapache-go/v3"

	ulid "github.com/gaucho-racing/ulid-go"
	"gorm.io/gorm/clause"
)

// GetCAN looks up a stored CAN frame by its ulid. Returns the zero value
// if no row matches.
func GetCAN(id string) (model.CAN, error) {
	var can model.CAN
	if err := database.DB.Where("id = ?", id).First(&can).Error; err != nil {
		return model.CAN{}, err
	}
	return can, nil
}

// GetCANForSignal looks up the CAN frame that produced a given signal by
// joining on the natural keys (vehicle_id, timestamp, node_id) — node_id
// is recovered from the signal name's prefix, since CreateSignals stamps
// each signal with the node it was decoded from as `<node>_<short>`.
// Returns gorm.ErrRecordNotFound if no frame matches (e.g., the source
// frame was never persisted, or the signal name doesn't follow the
// node-prefix convention).
func GetCANForSignal(signalID string) (model.CAN, error) {
	var can model.CAN
	err := database.DB.
		Joins("JOIN signal ON gr26_can.vehicle_id = signal.vehicle_id"+
			" AND gr26_can.timestamp = signal.timestamp"+
			" AND gr26_can.node_id = split_part(signal.name, '_', 1)").
		Where("signal.id = ?", signalID).
		First(&can).Error
	if err != nil {
		return model.CAN{}, err
	}
	return can, nil
}

// GetSignalsForCAN returns every signal that was decoded from the given
// CAN frame, joining on the natural keys (vehicle_id, timestamp, node_id).
// Ordered by signal name so the response is stable and easy to scan.
func GetSignalsForCAN(canMessageID string) ([]mapache.Signal, error) {
	var signals []mapache.Signal
	err := database.DB.
		Joins("JOIN gr26_can ON signal.vehicle_id = gr26_can.vehicle_id"+
			" AND signal.timestamp = gr26_can.timestamp"+
			" AND gr26_can.node_id = split_part(signal.name, '_', 1)").
		Where("gr26_can.id = ?", canMessageID).
		Order("signal.name ASC").
		Find(&signals).Error
	if err != nil {
		return nil, err
	}
	return signals, nil
}

// CreateCAN inserts (or upserts) a CAN frame record and returns it with
// the stored id populated. Conflicts on (vehicle_id, node_id, timestamp)
// update the payload columns and leave the id stable.
func CreateCAN(can model.CAN) (model.CAN, error) {
	can.ID = ulid.Make().Prefixed("can")
	if !config.EnableSignalDB {
		return can, nil
	}
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

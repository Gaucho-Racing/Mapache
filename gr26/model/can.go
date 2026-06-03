package model

import "time"

// CAN is a stored record of a single decoded CAN frame received from a
// gr26 vehicle. The composite (vehicle_id, node_id, timestamp) tuple
// uniquely identifies a frame. The signal table joins back to this row
// via that same tuple (node_id is recovered from the signal name's
// prefix) — no separate link table required.
type CAN struct {
	ID         string    `json:"id" gorm:"primaryKey"`
	VehicleID  string    `json:"vehicle_id" gorm:"uniqueIndex:idx_gr26_can_unique"`
	NodeID     string    `json:"node_id" gorm:"uniqueIndex:idx_gr26_can_unique"`
	Timestamp  int       `json:"timestamp" gorm:"uniqueIndex:idx_gr26_can_unique"`
	CANID      int       `json:"can_id"`
	Bytes      []byte    `json:"bytes" gorm:"type:bytea"`
	UploadKey  int       `json:"upload_key"`
	// Metadata always carries a {"status": ...} field describing the
	// decode outcome (ok, unknown_can_id, decode_error) and an optional
	// "note" with the human-readable detail.
	Metadata   []byte    `json:"metadata,omitempty" gorm:"type:jsonb"`
	ProducedAt time.Time `json:"produced_at" gorm:"precision:6"`
	CreatedAt  time.Time `json:"created_at" gorm:"autoCreateTime;precision:6"`
}

func (CAN) TableName() string {
	return "gr26_can"
}

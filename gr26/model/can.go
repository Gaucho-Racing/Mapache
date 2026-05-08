package model

import "time"

// CAN is a stored record of a single decoded CAN frame received from a
// gr26 vehicle. The composite (vehicle_id, node_id, timestamp) tuple
// uniquely identifies a frame; ulid is the surrogate key used by the
// gr26_can_signal join table.
type CAN struct {
	ID         string    `json:"id" gorm:"primaryKey"`
	VehicleID  string    `json:"vehicle_id" gorm:"uniqueIndex:idx_gr26_can_unique"`
	NodeID     string    `json:"node_id" gorm:"uniqueIndex:idx_gr26_can_unique"`
	Timestamp  int       `json:"timestamp" gorm:"uniqueIndex:idx_gr26_can_unique"`
	CANID      int       `json:"can_id"`
	Bytes      []byte    `json:"bytes" gorm:"type:bytea"`
	UploadKey  int       `json:"upload_key"`
	ProducedAt time.Time `json:"produced_at" gorm:"precision:6"`
	CreatedAt  time.Time `json:"created_at" gorm:"autoCreateTime;precision:6"`
}

func (CAN) TableName() string {
	return "gr26_can"
}

// CANSignal joins each persisted signal back to the CAN frame it was
// decoded from. SignalID is the primary key because the relationship is
// one-to-many (one frame, many signals; each signal traces to exactly
// one frame).
type CANSignal struct {
	SignalID     string    `json:"signal_id" gorm:"primaryKey"`
	CANMessageID string    `json:"can_message_id" gorm:"index"`
	CreatedAt    time.Time `json:"created_at" gorm:"autoCreateTime;precision:6"`
}

func (CANSignal) TableName() string {
	return "gr26_can_signal"
}

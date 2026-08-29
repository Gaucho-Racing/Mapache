package model

import "time"

// CAN is a stored record of a decoded CAN frame.
//
// NodeID carries the bus label (pcan, kcan, tcm) rather than a sender node
// id. On stock Porsche CAN the sending ECU is a function of the
// arbitration id, so the only routing fact the id cannot carry is which
// physical bus the frame arrived on — and two buses have independent
// 11-bit id spaces, so the bus is part of the natural key.
//
// Natural key: (vehicle_id, node_id, timestamp).
// Metadata carries {"status": ok|unknown_can_id|decode_error|..., "note": ...}.
type CAN struct {
	ID         string    `json:"id"`
	VehicleID  string    `json:"vehicle_id"`
	NodeID     string    `json:"node_id"`
	Timestamp  int       `json:"timestamp"`
	CANID      int       `json:"can_id"`
	Bytes      []byte    `json:"bytes"`
	UploadKey  int       `json:"upload_key"`
	Metadata   []byte    `json:"metadata,omitempty"`
	ProducedAt time.Time `json:"produced_at"`
	CreatedAt  time.Time `json:"created_at"`
}

func (CAN) TableName() string {
	return "p987_can"
}

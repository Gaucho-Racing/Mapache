package mapache

import (
	"time"
)

// SignMode is a type to represent whether an integer is signed or unsigned.
type SignMode int

const (
	Signed   SignMode = 1
	Unsigned SignMode = 0
)

// Endian is a type to represent whether an integer is big endian or little endian.
type Endian int

const (
	BigEndian    Endian = 1
	LittleEndian Endian = 0
)

// Signal is a type to represent an individual signal coming from the vehicle.
// This can be something like a sensor reading, a boolean flag, or a status code.
// Timestamp, VehicleID, and Name are together used to uniquely identify a signal row entry.
type Signal struct {
	// Timestamp is the Unix microseconds of the signal.
	Timestamp int `json:"timestamp"`
	// VehicleID is the unique identifier for the vehicle that the signal is associated with.
	VehicleID string `json:"vehicle_id"`
	// Name represents the name of the signal.
	Name string `json:"name"`
	// Value is the value of the signal post-scaling.
	Value float64 `json:"value"`
	// RawValue is the raw value of the signal before scaling.
	RawValue int `json:"raw_value"`
	// ProducedAt is the time at which the signal was produced by the vehicle.
	ProducedAt time.Time `json:"produced_at" gorm:"precision:6"`
	// CreatedAt is the time at which the signal was actually stored in the database.
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime;precision:6"`
}

func (Signal) TableName() string {
	return "signal"
}

package mapache

import (
	"time"
)

type Vehicle struct {
	// ID is a unique identifier for the vehicle.
	ID string `json:"id" gorm:"primaryKey"`

	// The Name is the public-facing name of the vehicle.
	Name string `json:"name"`

	// The Description is a brief description of the vehicle.
	Description string `json:"description"`

	// The Type is the type of vehicle, usually the year classification (gr23, gr24, etc).
	// This is used to identify the vehicle's controller architecture.
	Type string `json:"type"`

	// The UploadKey is a unique identifier for the vehicle's uploaded files.
	// This is used to authenticate the vehicle when processing uploaded data.
	UploadKey int `json:"upload_key"`

	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime;precision:6"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime;precision:6"`
}

func (Vehicle) TableName() string {
	return "vehicle"
}

type Trip struct {
	// ID is a unique identifier for the trip.
	ID string `json:"id" gorm:"primaryKey"`
	// The VehicleID is the unique identifier for the vehicle that the trip is associated with.
	VehicleID string `json:"vehicle_id"`
	// The Name is the public-facing name of the trip.
	Name string `json:"name"`
	// The Description is a brief description of the trip. This can include any notes or comments.
	// In theory, would be a markdown-supported field.
	Description string `json:"description"`
	// The StartTime is the time at which the trip started.
	StartTime time.Time `json:"start_time" gorm:"precision:6"`
	// The EndTime is the time at which the trip is over.
	EndTime time.Time `json:"end_time" gorm:"precision:6"`
	// The Laps field is a list of laps that are associated with the trip.
	// Laps are essentially markers that separate the trip into smaller segments.
	Laps []Lap `json:"laps" gorm:"-"`
}

func (Trip) TableName() string {
	return "trip"
}

type Lap struct {
	// ID is a unique identifier for the lap.
	ID string `json:"id" gorm:"primaryKey"`
	// The TripID is the unique identifier for the trip that the lap is associated with.
	TripID string `json:"trip_id"`
	// The Name is the public-facing name of the lap.
	Name string `json:"name"`
	// The Timestamp is the time at which the lap segment is over.
	// The start time of the lap would be inferred from the previous lap's end time
	// or the beginning of the trip.
	Timestamp time.Time `json:"timestamp" gorm:"precision:6"`
}

func (Lap) TableName() string {
	return "trip_lap"
}

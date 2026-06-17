package mapache

import (
	"sort"
	"time"
)

type Vehicle struct {
	ID          string    `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Type        string    `json:"type"`
	UploadKey   int       `json:"upload_key"`
	UpdatedAt   time.Time `json:"updated_at" gorm:"autoUpdateTime;precision:6"`
	CreatedAt   time.Time `json:"created_at" gorm:"autoCreateTime;precision:6"`
}

func (Vehicle) TableName() string {
	return "vehicle"
}

type Session struct {
	ID          string    `json:"id" gorm:"primaryKey"`
	VehicleID   string    `json:"vehicle_id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	StartTime   time.Time `json:"start_time" gorm:"precision:6"`
	EndTime     time.Time `json:"end_time" gorm:"precision:6"`
	// Analysis holds the Lapache lap-analysis result as a jsonb blob.
	Analysis   JSON        `json:"analysis" gorm:"type:jsonb;default:'{}'"`
	Markers    []Marker    `json:"markers" gorm:"-"`
	Segments   []Segment   `json:"segments" gorm:"-"`
	Laps       []Lap       `json:"laps" gorm:"-"`
	LapSummary *LapSummary `json:"lap_summary" gorm:"-"`
}

func (Session) TableName() string {
	return "session"
}

type Lap struct {
	ID         string    `json:"id" gorm:"primaryKey"`
	SessionID  string    `json:"session_id" gorm:"index"`
	LapNumber  int       `json:"lap_number"`
	StartTime  time.Time `json:"start_time" gorm:"precision:6"`
	EndTime    time.Time `json:"end_time" gorm:"precision:6"`
	DurationMs int64     `json:"duration_ms"`
	IsBest     bool      `json:"is_best"`
	CreatedAt  time.Time `json:"created_at" gorm:"autoCreateTime;precision:6"`
	Sectors    []Sector  `json:"sectors" gorm:"-"`
}

func (Lap) TableName() string {
	return "session_lap"
}

type Sector struct {
	ID           string `json:"id" gorm:"primaryKey"`
	LapID        string `json:"lap_id" gorm:"index"`
	SessionID    string `json:"session_id" gorm:"index"`
	SectorNumber int    `json:"sector_number"`
	DurationMs   int64  `json:"duration_ms"`
}

func (Sector) TableName() string {
	return "session_sector"
}

type LapSummary struct {
	Count   int   `json:"count"`
	BestMs  int64 `json:"best_ms"`
	AvgMs   int64 `json:"avg_ms"`
	WorstMs int64 `json:"worst_ms"`
}

type Marker struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	SessionID string    `json:"session_id"`
	Name      string    `json:"name"`
	Timestamp time.Time `json:"timestamp" gorm:"precision:6"`
}

func (Marker) TableName() string {
	return "session_marker"
}

type Segment struct {
	Number    int       `json:"number"`
	StartTime time.Time `json:"start_time"`
	EndTime   time.Time `json:"end_time"`
}

func DeriveSegments(session Session) []Segment {
	if len(session.Markers) == 0 {
		return []Segment{
			{Number: 1, StartTime: session.StartTime, EndTime: session.EndTime},
		}
	}

	sorted := make([]Marker, len(session.Markers))
	copy(sorted, session.Markers)
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].Timestamp.Before(sorted[j].Timestamp)
	})

	segments := make([]Segment, 0, len(sorted)+1)
	segments = append(segments, Segment{
		Number:    1,
		StartTime: session.StartTime,
		EndTime:   sorted[0].Timestamp,
	})
	for i := 0; i < len(sorted)-1; i++ {
		segments = append(segments, Segment{
			Number:    i + 2,
			StartTime: sorted[i].Timestamp,
			EndTime:   sorted[i+1].Timestamp,
		})
	}
	segments = append(segments, Segment{
		Number:    len(sorted) + 1,
		StartTime: sorted[len(sorted)-1].Timestamp,
		EndTime:   session.EndTime,
	})

	return segments
}

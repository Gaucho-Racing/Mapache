package mapache

import "time"

// Dashboard is a user-curated collection of widgets arranged on a grid.
// Widgets are stored in a separate `dashboard_widget` table and joined
// via DashboardID; the loader populates Widgets here for API responses.
type Dashboard struct {
	ID          string    `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	// CreatedBy is the entity_id of the dashboard creator. Recorded for
	// audit; access is currently global (any bearer-authenticated user
	// can read or edit).
	CreatedBy string            `json:"created_by"`
	Widgets   []DashboardWidget `json:"widgets" gorm:"-"`
	UpdatedAt time.Time         `json:"updated_at" gorm:"autoUpdateTime;precision:6"`
	CreatedAt time.Time         `json:"created_at" gorm:"autoCreateTime;precision:6"`
}

func (Dashboard) TableName() string {
	return "dashboard"
}

// DashboardWidget is one rectangular pane on a dashboard. Type drives
// which renderer the frontend mounts; Config carries the renderer's
// type-specific settings as JSON (queries, chart type, axis overrides,
// color, etc.). X/Y/W/H are react-grid-layout coordinates.
type DashboardWidget struct {
	ID          string `json:"id" gorm:"primaryKey"`
	DashboardID string `json:"dashboard_id" gorm:"index"`
	// Type is the widget renderer key — e.g. "signal" for the MQL-driven
	// chart, "gauge" for a single-value dial, "map" for a GPS trace.
	// Unknown types render as a placeholder so a stale frontend
	// doesn't crash on a newer backend's data.
	Type   string `json:"type"`
	Config JSON   `json:"config" gorm:"type:jsonb;default:'{}'"`
	// react-grid-layout cell coordinates. The grid is 12 columns wide;
	// rows are measured in "row units" (configured client-side, typically
	// ~30px). H/W are in cells, X/Y are zero-based.
	X         int       `json:"x"`
	Y         int       `json:"y"`
	W         int       `json:"w"`
	H         int       `json:"h"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime;precision:6"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime;precision:6"`
}

func (DashboardWidget) TableName() string {
	return "dashboard_widget"
}

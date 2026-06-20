package service

import (
	mapache "github.com/gaucho-racing/mapache/mapache-go/v3"
	"github.com/gaucho-racing/mapache/vehicle/database"
)

// GetAllDashboards returns every dashboard, most recently updated first.
// Widgets are NOT loaded — the list page only needs the metadata; widget
// payloads can be sizeable (jsonb config blobs per widget).
func GetAllDashboards() []mapache.Dashboard {
	var dashboards []mapache.Dashboard
	database.DB.Order("updated_at DESC").Find(&dashboards)
	return dashboards
}

// GetDashboardByID returns one dashboard with its widget list populated.
// Widgets are ordered by (y, x) so the response array matches reading
// order on the rendered grid — useful for keyboard navigation and for
// debugging without re-running the grid math.
func GetDashboardByID(id string) (mapache.Dashboard, error) {
	var dashboard mapache.Dashboard
	if err := database.DB.Where("id = ?", id).First(&dashboard).Error; err != nil {
		return mapache.Dashboard{}, err
	}
	var widgets []mapache.DashboardWidget
	database.DB.Where("dashboard_id = ?", id).Order("y, x").Find(&widgets)
	dashboard.Widgets = widgets
	return dashboard, nil
}

func CreateDashboard(d mapache.Dashboard) (mapache.Dashboard, error) {
	if err := database.DB.Create(&d).Error; err != nil {
		return mapache.Dashboard{}, err
	}
	return d, nil
}

func UpdateDashboard(d mapache.Dashboard) (mapache.Dashboard, error) {
	// GORM's Save() does a full row upsert; we want it because the
	// frontend can edit name + description in one request.
	if err := database.DB.Save(&d).Error; err != nil {
		return mapache.Dashboard{}, err
	}
	return d, nil
}

func DeleteDashboard(id string) error {
	// Widgets are deleted via the dashboard_id FK constraint at the
	// service layer, not via GORM cascade — keeping the foreign-key
	// behavior explicit so a dashboard delete doesn't silently orphan
	// rows if the constraint is ever dropped.
	if err := database.DB.Where("dashboard_id = ?", id).Delete(&mapache.DashboardWidget{}).Error; err != nil {
		return err
	}
	return database.DB.Where("id = ?", id).Delete(&mapache.Dashboard{}).Error
}

func CreateWidget(w mapache.DashboardWidget) (mapache.DashboardWidget, error) {
	if err := database.DB.Create(&w).Error; err != nil {
		return mapache.DashboardWidget{}, err
	}
	return w, nil
}

func UpdateWidget(w mapache.DashboardWidget) (mapache.DashboardWidget, error) {
	if err := database.DB.Save(&w).Error; err != nil {
		return mapache.DashboardWidget{}, err
	}
	return w, nil
}

func DeleteWidget(id string) error {
	return database.DB.Where("id = ?", id).Delete(&mapache.DashboardWidget{}).Error
}

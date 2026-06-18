package service

import (
	mapache "github.com/gaucho-racing/mapache/mapache-go/v3"
	"github.com/gaucho-racing/mapache/vehicle/database"
	ulid "github.com/gaucho-racing/ulid-go"
	"gorm.io/gorm"
)

func GetLapsForSession(sessionID string) []mapache.Lap {
	var laps []mapache.Lap
	database.DB.Where("session_id = ?", sessionID).Order("lap_number asc").Find(&laps)
	if len(laps) == 0 {
		return laps
	}
	var sectors []mapache.Sector
	database.DB.Where("session_id = ?", sessionID).Order("sector_number asc").Find(&sectors)
	sectorsByLap := make(map[string][]mapache.Sector)
	for _, sector := range sectors {
		sectorsByLap[sector.LapID] = append(sectorsByLap[sector.LapID], sector)
	}
	for i := range laps {
		laps[i].Sectors = sectorsByLap[laps[i].ID]
		if laps[i].Sectors == nil {
			laps[i].Sectors = []mapache.Sector{}
		}
	}
	return laps
}

func ReplaceLapsForSession(sessionID string, laps []mapache.Lap) error {
	return database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("session_id = ?", sessionID).Delete(&mapache.Sector{}).Error; err != nil {
			return err
		}
		if err := tx.Where("session_id = ?", sessionID).Delete(&mapache.Lap{}).Error; err != nil {
			return err
		}
		for i := range laps {
			lap := laps[i]
			lap.ID = ulid.Make().Prefixed("lap")
			lap.SessionID = sessionID
			sectors := lap.Sectors
			lap.Sectors = nil
			if err := tx.Create(&lap).Error; err != nil {
				return err
			}
			for j := range sectors {
				sector := sectors[j]
				sector.ID = ulid.Make().Prefixed("sec")
				sector.LapID = lap.ID
				sector.SessionID = sessionID
				if err := tx.Create(&sector).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})
}

func DeleteLapsForSession(sessionID string) error {
	if err := database.DB.Where("session_id = ?", sessionID).Delete(&mapache.Sector{}).Error; err != nil {
		return err
	}
	if err := database.DB.Where("session_id = ?", sessionID).Delete(&mapache.Lap{}).Error; err != nil {
		return err
	}
	return nil
}

func GetLapSummariesByVehicle(vehicleID string) map[string]mapache.LapSummary {
	type row struct {
		SessionID string
		Count     int
		BestMs    int64
		AvgMs     int64
		WorstMs   int64
	}
	var rows []row
	database.DB.
		Table("session_lap").
		Select("session_lap.session_id AS session_id, "+
			"COUNT(*) AS count, "+
			"MIN(session_lap.duration_ms) AS best_ms, "+
			"COALESCE(ROUND(AVG(session_lap.duration_ms)), 0) AS avg_ms, "+
			"MAX(session_lap.duration_ms) AS worst_ms").
		Joins("JOIN session ON session.id = session_lap.session_id").
		Where("session.vehicle_id = ?", vehicleID).
		Group("session_lap.session_id").
		Scan(&rows)

	summaries := make(map[string]mapache.LapSummary, len(rows))
	for _, r := range rows {
		summaries[r.SessionID] = mapache.LapSummary{
			Count:   r.Count,
			BestMs:  r.BestMs,
			AvgMs:   r.AvgMs,
			WorstMs: r.WorstMs,
		}
	}
	return summaries
}

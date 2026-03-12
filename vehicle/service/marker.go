package service

import (
	mapache "github.com/gaucho-racing/mapache/mapache-go"
	ulid "github.com/gaucho-racing/ulid-go"
	"github.com/gaucho-racing/mapache/vehicle/database"
)

func GetAllMarkersForSession(sessionID string) []mapache.Marker {
	var markers []mapache.Marker
	database.DB.Where("session_id = ?", sessionID).Order("timestamp asc").Find(&markers)
	return markers
}

func CreateMarker(marker mapache.Marker) error {
	marker.ID = ulid.Make().Prefixed("mrk")
	result := database.DB.Create(&marker)
	if result.Error != nil {
		return result.Error
	}
	return nil
}

func DeleteMarker(markerID string) error {
	result := database.DB.Where("id = ?", markerID).Delete(&mapache.Marker{})
	if result.Error != nil {
		return result.Error
	}
	return nil
}

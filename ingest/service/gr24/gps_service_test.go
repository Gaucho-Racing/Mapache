package gr24service

import (
	"ingest/utils"
	"testing"
)

func TestParseGPS(t *testing.T) {
	utils.InitializeLogger()
	t.Run("GPS Test 1", func(t *testing.T) {
		// Arrange
		data := []byte{0, 0, 0, 0, 0, 0, 0, 0}
		// Act
		gps := parseGPS(data)
		// Assert
		if gps.ID == "" {
			t.Error("Expected gps.ID to not be empty")
		}
		if gps.Latitude != 0 {
			t.Errorf("Expected gps.Latitude to be 0, got %v", gps.Latitude)
		}
		if gps.Longitude != 0 {
			t.Errorf("Expected gps.Longitude to be 0, got %v", gps.Longitude)
		}
	})
	t.Run("GPS Test 2", func(t *testing.T) {
		// Arrange
		data := []byte{0, 183, 0, 138, 11, 193, 2, 6, 192}
		// Act
		gps := parseGPS(data)
		// Assert
		if gps.ID != "" {
			t.Error("Expected gps.ID to be empty")
		}
	})
}

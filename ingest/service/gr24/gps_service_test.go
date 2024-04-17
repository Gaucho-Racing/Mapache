package gr24service

import (
	gr24model "ingest/model/gr24"
	"ingest/utils"
	"testing"
)

func TestGPSSubscribe(t *testing.T) {
	utils.InitializeLogger()
	t.Run("GPS Subscribe Test 1", func(t *testing.T) {
		// Arrange
		gpsCallbacks = []func(gps gr24model.GPS){}
		// Act
		GPSSubscribe(func(gps gr24model.GPS) {})
		// Assert
		if len(gpsCallbacks) != 1 {
			t.Errorf("Expected gpsCallbacks length to be 1, got %v", len(gpsCallbacks))
		}
	})
	t.Run("GPS Subscribe Test 2", func(t *testing.T) {
		// Arrange
		gpsCallbacks = []func(gps gr24model.GPS){}
		// Act
		GPSSubscribe(func(gps gr24model.GPS) {})
		GPSSubscribe(func(gps gr24model.GPS) {})
		// Assert
		if len(gpsCallbacks) != 2 {
			t.Errorf("Expected gpsCallbacks length to be 2, got %v", len(gpsCallbacks))
		}
	})
}

func TestGPSNotify(t *testing.T) {
	utils.InitializeLogger()
	t.Run("GPS Notify Test 1", func(t *testing.T) {
		// Arrange
		gpsCallbacks = []func(gps gr24model.GPS){}
		gps := gr24model.GPS{
			ID: "test",
		}
		// Act
		GPSSubscribe(func(gps gr24model.GPS) {
			// Assert
			if gps.ID != "test" {
				t.Error("Expected gps.ID to not be empty")
			}
		})
		gpsNotify(gps)
	})
}

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

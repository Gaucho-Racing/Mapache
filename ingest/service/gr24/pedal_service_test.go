package gr24service

import (
	"ingest/utils"
	"testing"
)

func TestParsePedal(t *testing.T) {
	utils.InitializeLogger()
	t.Run("Pedal Test 1", func(t *testing.T) {
		// Arrange
		data := []byte{0, 0, 0, 0, 0, 0, 0, 0}
		// Act
		pedal := parsePedal(data)
		// Assert
		if pedal.ID == "" {
			t.Error("Expected pedal.ID to not be empty")
		}
		if pedal.APPSOne != 0 {
			t.Errorf("Expected pedal.APPSOne to be 0, got %v", pedal.APPSOne)
		}
		if pedal.APPSTwo != 0 {
			t.Errorf("Expected pedal.APPSTwo to be 0, got %v", pedal.APPSTwo)
		}
		if pedal.BrakePressureFront != 0 {
			t.Errorf("Expected pedal.BrakePressureFront to be 0, got %v", pedal.BrakePressureFront)
		}
		if pedal.BrakePressureRear != 0 {
			t.Errorf("Expected pedal.BrakePressureRear to be 0, got %v", pedal.BrakePressureRear)
		}
	})
	t.Run("Pedal Test 2", func(t *testing.T) {
		// Arrange
		data := []byte{0, 183, 0, 138, 11, 193, 2, 6}
		// Act
		pedal := parsePedal(data)
		// Assert
		if pedal.ID == "" {
			t.Error("Expected pedal.ID to not be empty")
		}
		if pedal.APPSOne != 183 {
			t.Errorf("Expected pedal.APPSOne to be 183, got %v", pedal.APPSOne)
		}
		if pedal.APPSTwo != 138 {
			t.Errorf("Expected pedal.APPSTwo to be 138, got %v", pedal.APPSTwo)
		}
		if pedal.BrakePressureFront != 3009 {
			t.Errorf("Expected pedal.BrakePressureFront to be 3009, got %v", pedal.BrakePressureFront)
		}
		if pedal.BrakePressureRear != 518 {
			t.Errorf("Expected pedal.BrakePressureRear to be 518, got %v", pedal.BrakePressureRear)
		}
	})
	t.Run("Pedal Test 3", func(t *testing.T) {
		// Arrange
		data := []byte{0, 183, 0, 138, 11, 193, 2, 6, 192}
		// Act
		pedal := parsePedal(data)
		// Assert
		if pedal.ID != "" {
			t.Error("Expected pedal.ID to be empty")
		}
	})
}

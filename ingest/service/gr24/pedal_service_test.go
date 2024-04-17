package gr24service

import (
	gr24model "ingest/model/gr24"
	"ingest/utils"
	"testing"
)

func TestPedalSubscribe(t *testing.T) {
	utils.InitializeLogger()
	t.Run("Pedal Subscribe Test 1", func(t *testing.T) {
		// Arrange
		pedalCallbacks = []func(pedal gr24model.Pedal){}
		// Act
		PedalSubscribe(func(pedal gr24model.Pedal) {})
		// Assert
		if len(pedalCallbacks) != 1 {
			t.Errorf("Expected pedalCallbacks length to be 1, got %v", len(pedalCallbacks))
		}
	})
	t.Run("Pedal Subscribe Test 2", func(t *testing.T) {
		// Arrange
		pedalCallbacks = []func(pedal gr24model.Pedal){}
		// Act
		PedalSubscribe(func(pedal gr24model.Pedal) {})
		PedalSubscribe(func(pedal gr24model.Pedal) {})
		// Assert
		if len(pedalCallbacks) != 2 {
			t.Errorf("Expected pedalCallbacks length to be 2, got %v", len(pedalCallbacks))
		}
	})
}

func TestPedalNotify(t *testing.T) {
	utils.InitializeLogger()
	t.Run("Pedal Notify Test 1", func(t *testing.T) {
		// Arrange
		pedalCallbacks = []func(pedal gr24model.Pedal){}
		pedal := gr24model.Pedal{
			ID: "test",
		}
		// Act
		PedalSubscribe(func(pedal gr24model.Pedal) {
			// Assert
			if pedal.ID != "test" {
				t.Error("Expected pedal.ID to not be empty")
			}
		})
		pedalNotify(pedal)
	})
}

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

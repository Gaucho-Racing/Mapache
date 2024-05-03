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

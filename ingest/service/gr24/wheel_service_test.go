package gr24service

import (
	"ingest/utils"
	"testing"
)

func TestParseWheel(t *testing.T) {
	utils.InitializeLogger()
	t.Run("Wheel Test 1", func(t *testing.T) {
		// Arrange
		data := make([]byte, 40)
		// Act
		wheel := parseWheel(data)
		// Assert
		if wheel.ID == "" {
			t.Error("Expected wheel.ID to not be empty")
		}
	})
	t.Run("Wheel Test 2", func(t *testing.T) {
		// Arrange
		data := []byte{0, 183, 0, 138, 11, 193, 2, 6, 192}
		// Act
		wheel := parseWheel(data)
		// Assert
		if wheel.ID != "" {
			t.Error("Expected wheel.ID to be empty")
		}
	})
}

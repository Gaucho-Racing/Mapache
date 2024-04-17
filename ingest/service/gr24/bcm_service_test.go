package gr24service

import (
	gr24model "ingest/model/gr24"
	"ingest/utils"
	"testing"
)

func TestBCMSubscribe(t *testing.T) {
	utils.InitializeLogger()
	t.Run("BCM Subscribe Test 1", func(t *testing.T) {
		// Arrange
		bcmCallbacks = []func(bcm gr24model.BCM){}
		// Act
		BCMSubscribe(func(bcm gr24model.BCM) {})
		// Assert
		if len(bcmCallbacks) != 1 {
			t.Errorf("Expected bcmCallbacks length to be 1, got %v", len(bcmCallbacks))
		}
	})
	t.Run("BCM Subscribe Test 2", func(t *testing.T) {
		// Arrange
		bcmCallbacks = []func(bcm gr24model.BCM){}
		// Act
		BCMSubscribe(func(bcm gr24model.BCM) {})
		BCMSubscribe(func(bcm gr24model.BCM) {})
		// Assert
		if len(bcmCallbacks) != 2 {
			t.Errorf("Expected bcmCallbacks length to be 2, got %v", len(bcmCallbacks))
		}
	})
}

func TestBCMNotify(t *testing.T) {
	utils.InitializeLogger()
	t.Run("BCM Notify Test 1", func(t *testing.T) {
		// Arrange
		bcmCallbacks = []func(bcm gr24model.BCM){}
		bcm := gr24model.BCM{
			ID: "test",
		}
		// Act
		BCMSubscribe(func(bcm gr24model.BCM) {
			// Assert
			if bcm.ID != "test" {
				t.Error("Expected bcm.ID to not be empty")
			}
		})
		bcmNotify(bcm)
	})
}

func TestParseBCM(t *testing.T) {
	utils.InitializeLogger()
	t.Run("BCM Test 1", func(t *testing.T) {
		// Arrange
		data := make([]byte, 184)
		// Act
		bcm := parseBCM(data)
		// Assert
		if bcm.ID == "" {
			t.Error("Expected bcm.ID to not be empty")
		}
	})
	t.Run("BCM Test 2", func(t *testing.T) {
		// Arrange
		data := []byte{0, 183, 0, 138, 11, 193, 2, 6, 192}
		// Act
		bcm := parseBCM(data)
		// Assert
		if bcm.ID != "" {
			t.Error("Expected bcm.id to be empty")
		}
	})
}

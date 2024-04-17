package service

import (
	"os"
	"testing"
)

func TestGetScaleEnvVar(t *testing.T) {
	t.Run("Scale Env Var Test 1", func(t *testing.T) {
		// Arrange
		os.Setenv("SCALE_TEST_NODE_GPS", "1.4")
		// Act
		scaleVar := GetScaleEnvVar("test", "node", "gps")
		// Assert
		if scaleVar != 1.4 {
			t.Errorf("Expected scaleVar to be 1.4, got %v", scaleVar)
		}
	})
	t.Run("Scale Env Var Test 2", func(t *testing.T) {
		// Arrange
		os.Setenv("SCALE_TEST_NODE_PEDAL", "abc")
		// Act
		scaleVar := GetScaleEnvVar("test", "node", "pedal")
		// Assert
		if scaleVar != 1 {
			t.Errorf("Expected scaleVar to be 1, got %v", scaleVar)
		}
	})
	t.Run("Scale Env Var Test 3", func(t *testing.T) {
		// Arrange
		os.Setenv("SCALE_TEST_NODE_ROCK", "")
		// Act
		scaleVar := GetScaleEnvVar("test", "node", "rock")
		// Assert
		if scaleVar != 1 {
			t.Errorf("Expected scaleVar to be 1, got %v", scaleVar)
		}
	})
	t.Run("Scale Env Var Test 4", func(t *testing.T) {
		// Arrange
		os.Setenv("SCALE_TEST_NODE_ONYX", "2aoe.0")
		// Act
		scaleVar := GetScaleEnvVar("test", "node", "onyx")
		// Assert
		if scaleVar != 1 {
			t.Errorf("Expected scaleVar to be 1, got %v", scaleVar)
		}
	})
	t.Run("Scale Env Var Test 5", func(t *testing.T) {
		// Arrange
		os.Setenv("SCALE_TEST_NODE_CYPHER", "0.0")
		// Act
		scaleVar := GetScaleEnvVar("test", "node", "cypher")
		// Assert
		if scaleVar != 0 {
			t.Errorf("Expected scaleVar to be 0, got %v", scaleVar)
		}
	})
}

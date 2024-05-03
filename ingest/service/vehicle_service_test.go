package service

import (
	"context"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/mysql"
	"ingest/config"
	"ingest/database"
	"ingest/model"
	"ingest/utils"
	"os"
	"strings"
	"testing"
	"time"
)

func TestMain(m *testing.M) {
	utils.InitializeLogger()
	ctx := context.Background()
	mysqlContainer, err := mysql.RunContainer(ctx,
		testcontainers.WithImage("mysql:8.3"),
		mysql.WithDatabase(config.DatabaseName),
		mysql.WithUsername(config.DatabaseUser),
		mysql.WithPassword(config.DatabasePassword),
	)
	if err != nil {
		utils.SugarLogger.Fatalf("failed to start container: %s", err)
	}
	defer func() {
		if err := mysqlContainer.Terminate(ctx); err != nil {
			utils.SugarLogger.Fatalf("failed to terminate container: %s", err)
		}
	}()
	p, err := mysqlContainer.MappedPort(ctx, "3306")
	if err != nil {
		utils.SugarLogger.Fatalf("failed to get mapped port: %s", err)
	}
	config.DatabasePort = p.Port()
	database.InitializeDB()
	exitVal := m.Run()
	os.Exit(exitVal)
}

func TestGetAllVehicles(t *testing.T) {
	t.Run("Get All Vehicles 1", func(t *testing.T) {
		// Arrange
		database.DB.Where("1 = 1").Delete(&model.Vehicle{})
		// Act
		vehicles := GetAllVehicles()
		// Assert
		if len(vehicles) != 0 {
			t.Errorf("Expected vehicles length to be 0, got %v", len(vehicles))
		}
	})
}

func TestCreateVehicle(t *testing.T) {
	t.Run("Create Vehicle 1", func(t *testing.T) {
		// Arrange
		vehicle := model.Vehicle{
			ID:          "gr24",
			Name:        "GR24",
			Description: "GR24 Vehicle",
			UploadKey:   "some-key",
			CreatedAt:   time.Time{},
		}
		// Act
		err := CreateVehicle(vehicle)
		// Assert
		if err != nil {
			t.Errorf("Expected error to be nil, got %v", err)
		}
		vehicle = GetVehicleByID("gr24")
		if vehicle.ID != "gr24" {
			t.Errorf("Expected vehicle ID to be gr24, got %v", vehicle.ID)
		}
	})
	t.Run("Create Vehicle 2", func(t *testing.T) {
		vehicle := model.Vehicle{
			ID:          "gr24",
			Name:        "GR24",
			Description: "Updated GR24 Vehicle",
			UploadKey:   "some-key",
			CreatedAt:   time.Time{},
		}
		// Act
		err := CreateVehicle(vehicle)
		// Assert
		if err != nil {
			t.Errorf("Expected error to be nil, got %v", err)
		}
		vehicle = GetVehicleByID("gr24")
		if vehicle.Description != "Updated GR24 Vehicle" {
			t.Errorf("Expected vehicle description to be \"Updated GR24 Vehicle\", got %v", vehicle.Description)
		}
	})
	t.Run("Create Vehicle 3", func(t *testing.T) {
		// Arrange
		vehicle := model.Vehicle{
			ID:          strings.Repeat("a", 256),
			Name:        "LongIDVehicle",
			Description: "Vehicle with a very long ID",
			UploadKey:   "some-key",
			CreatedAt:   time.Time{},
		}
		// Act
		err := CreateVehicle(vehicle)
		// Assert
		if err == nil {
			t.Errorf("Expected error to be not nil, got nil")
		}
	})
}

func TestGetVehicleByID(t *testing.T) {
	t.Run("Get Vehicle By ID 1", func(t *testing.T) {
		// Arrange
		// Act
		vehicle := GetVehicleByID("gr24")
		// Assert
		if vehicle.ID != "gr24" {
			t.Errorf("Expected vehicle ID to be gr24, got %v", vehicle.ID)
		}
	})
}

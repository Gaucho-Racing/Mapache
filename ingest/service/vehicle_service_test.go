package service

import (
	"context"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/mysql"
	"ingest/config"
	"ingest/database"
	"ingest/utils"
	"log"
	"os"
	"testing"
)

func TestMain(m *testing.M) {
	utils.InitializeLogger()

	ctx := context.Background()
	mysqlContainer, err := mysql.RunContainer(ctx,
		testcontainers.WithImage("mysql:8.0.36"),
		mysql.WithDatabase(config.DatabaseName),
		mysql.WithUsername(config.DatabaseUser),
		mysql.WithPassword(config.DatabasePassword),
	)
	if err != nil {
		log.Fatalf("failed to start container: %s", err)
	}
	defer func() {
		if err := mysqlContainer.Terminate(ctx); err != nil {
			log.Fatalf("failed to terminate container: %s", err)
		}
	}()

	database.InitializeDB()
	exitVal := m.Run()
	os.Exit(exitVal)
}

func TestGetAllVehicles(t *testing.T) {
	t.Run("Get All Vehicles 1", func(t *testing.T) {
		// Arrange
		// Act
		vehicles := GetAllVehicles()
		// Assert
		if len(vehicles) != 0 {
			t.Errorf("Expected vehicles length to be 0, got %v", len(vehicles))
		}
	})
}
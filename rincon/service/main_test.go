package service

import (
	"context"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/mysql"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
	"log"
	"os"
	"rincon/config"
	"rincon/database"
	"rincon/model"
	"rincon/utils"
	"testing"
	"time"
)

func TestMain(m *testing.M) {
	utils.InitializeLogger()
	utils.VerifyConfig()
	database.InitializeLocal()

	// Test SQL connection failure before spinning up testcontainers
	database.InitializeDB()
	config.DatabaseDriver = "postgres"
	database.InitializeDB()

	// testcontainers time
	ctx := context.Background()
	ms := InitializeMysql(ctx)
	pg := InitializePostgres(ctx)
	defer func() {
		if err := pg.Terminate(ctx); err != nil {
			log.Fatalf("failed to terminate container: %s", err)
		}
		if err := ms.Terminate(ctx); err != nil {
			log.Fatalf("failed to terminate container: %s", err)
		}
	}()

	exitVal := m.Run()
	os.Exit(exitVal)
}

func InitializePostgres(ctx context.Context) *postgres.PostgresContainer {
	config.StorageMode = "sql"
	config.DatabaseDriver = "postgres"
	config.DatabaseHost = "localhost"
	config.DatabaseName = "rincon"
	config.DatabaseUser = "postgres"
	config.DatabasePassword = "postgres"
	postgresContainer, err := postgres.RunContainer(ctx,
		testcontainers.WithImage("docker.io/postgres:16-alpine"),
		postgres.WithDatabase(config.DatabaseName),
		postgres.WithUsername(config.DatabaseUser),
		postgres.WithPassword(config.DatabasePassword),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(5*time.Second)),
	)
	if err != nil {
		log.Fatalf("failed to start container: %s", err)
	}
	p, err := postgresContainer.MappedPort(ctx, "5432")
	if err != nil {
		log.Fatalf("failed to get mapped port: %s", err)
	}
	config.DatabasePort = p.Port()
	database.InitializeDB()
	return postgresContainer
}

func InitializeMysql(ctx context.Context) *mysql.MySQLContainer {
	config.StorageMode = "sql"
	config.DatabaseDriver = "mysql"
	config.DatabaseHost = "localhost"
	config.DatabaseName = "rincon"
	config.DatabaseUser = "admin"
	config.DatabasePassword = "admin"
	mysqlContainer, err := mysql.RunContainer(ctx,
		testcontainers.WithImage("mysql:8.3"),
		mysql.WithDatabase(config.DatabaseName),
		mysql.WithUsername(config.DatabaseUser),
		mysql.WithPassword(config.DatabasePassword),
	)
	if err != nil {
		utils.SugarLogger.Fatalf("failed to start container: %s", err)
	}
	p, err := mysqlContainer.MappedPort(ctx, "3306")
	if err != nil {
		utils.SugarLogger.Fatalf("failed to get mapped port: %s", err)
	}
	config.DatabasePort = p.Port()
	database.InitializeDB()
	return mysqlContainer
}

func ResetLocalDB() {
	config.StorageMode = "local"
	database.Local.Services = make([]model.Service, 0)
	database.Local.Routes = make([]model.Route, 0)
}

func ResetSQLDB() {
	config.StorageMode = "sql"
	database.DB.Where("1 = 1").Delete(&model.Service{})
	database.DB.Where("1 = 1").Delete(&model.Route{})
}

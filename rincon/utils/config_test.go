package utils

import (
	"rincon/config"
	"testing"
)

func TestVerifyConfig(t *testing.T) {
	InitializeLogger()
	t.Run("Test Blank Config", func(t *testing.T) {
		config.Env = ""
		VerifyConfig()
		if config.Env != "PROD" {
			t.Errorf("Env is not set to PROD")
		}
		if config.Port != "10311" {
			t.Errorf("Port is not set to 10311")
		}
		if config.AuthUser != "admin" {
			t.Errorf("AuthUser is not set to admin")
		}
		if config.AuthPassword != "admin" {
			t.Errorf("AuthPassword is not set to admin")
		}
		if config.ServiceIDLength != "6" {
			t.Errorf("ServiceIDLength is not set to 6")
		}
		if config.StorageMode != "local" {
			t.Errorf("StorageMode is not set to local")
		}
	})
	t.Run("Test Service ID Length", func(t *testing.T) {
		config.ServiceIDLength = "3"
		VerifyConfig()
		if config.ServiceIDLength != "4" {
			t.Errorf("ServiceIDLength is not set to 4")
		}
	})
	t.Run("Test SQL Storage Mode", func(t *testing.T) {
		config.StorageMode = "sql"
		config.DatabaseDriver = "postgres"
		config.DatabaseHost = "localhost"
		config.DatabasePort = "5432"
		config.DatabaseName = "rincon"
		config.DatabaseUser = "user"
		config.DatabasePassword = "password"
		VerifyConfig()
		if config.StorageMode != "sql" {
			t.Errorf("StorageMode is not set to sql")
		}
	})
	t.Run("Test Redis Storage Mode", func(t *testing.T) {
		config.StorageMode = "redis"
		VerifyConfig()
		if config.StorageMode != "redis" {
			t.Errorf("StorageMode is not set to redis")
		}
	})
	t.Run("Test Redis+SQL Storage Mode", func(t *testing.T) {
		config.StorageMode = "redis+sql"
		VerifyConfig()
		if config.StorageMode != "redis+sql" {
			t.Errorf("StorageMode is not set to redis+sql")
		}
	})
}

func TestVerifySql(t *testing.T) {
	InitializeLogger()
	t.Run("Test Blank Driver", func(t *testing.T) {
		config.StorageMode = "sql"
		config.DatabaseDriver = ""
		config.DatabaseHost = ""
		config.DatabasePort = ""
		config.DatabaseName = ""
		config.DatabaseUser = ""
		config.DatabasePassword = ""
		verifySql()
	})
}

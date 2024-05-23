package service

import (
	"rincon/database"
	"rincon/model"
	"testing"
	"time"
)

func TestCreateServiceLocal(t *testing.T) {
	ResetLocalDB()
	t.Run("Test No Name", func(t *testing.T) {
		service := model.Service{
			Version:     "1.0.0",
			Endpoint:    "http://localhost:8080",
			HealthCheck: "http://localhost:8080/health",
			UpdatedAt:   time.Time{},
			CreatedAt:   time.Time{},
		}
		_, err := CreateService(service)
		if err == nil {
			t.Errorf("No error when creating service: %v", err)
		}
	})
	t.Run("Test No Version", func(t *testing.T) {
		service := model.Service{
			Name:        "Service 1",
			Endpoint:    "http://localhost:8080",
			HealthCheck: "http://localhost:8080/health",
			UpdatedAt:   time.Time{},
			CreatedAt:   time.Time{},
		}
		_, err := CreateService(service)
		if err == nil {
			t.Errorf("No error when creating service: %v", err)
		}
	})
	t.Run("Test No Endpoint", func(t *testing.T) {
		service := model.Service{
			Name:        "Service 1",
			Version:     "1.0.0",
			HealthCheck: "http://localhost:8080/health",
			UpdatedAt:   time.Time{},
			CreatedAt:   time.Time{},
		}
		_, err := CreateService(service)
		if err == nil {
			t.Errorf("No error when creating service: %v", err)
		}
	})
	t.Run("Test No Healthcheck", func(t *testing.T) {
		service := model.Service{
			Name:      "Service 1",
			Version:   "1.0.0",
			Endpoint:  "http://localhost:8080",
			UpdatedAt: time.Time{},
			CreatedAt: time.Time{},
		}
		_, err := CreateService(service)
		if err == nil {
			t.Errorf("No error when creating service: %v", err)
		}
	})
	t.Run("Test Create Service", func(t *testing.T) {
		service := model.Service{
			Name:        "Service 1",
			Version:     "1.0.0",
			Endpoint:    "http://localhost:8080",
			HealthCheck: "http://localhost:8080/health",
			UpdatedAt:   time.Time{},
			CreatedAt:   time.Time{},
		}
		s, err := CreateService(service)
		if err != nil {
			t.Errorf("Error when creating service: %v", err)
		}
		if s.ID == 0 {
			t.Errorf("Service ID not set")
		}
	})
	t.Run("Test Update Service", func(t *testing.T) {
		service := model.Service{
			Name:        "Service 1",
			Version:     "1.1.0",
			Endpoint:    "http://localhost:8080",
			HealthCheck: "http://localhost:8080/health",
			UpdatedAt:   time.Time{},
			CreatedAt:   time.Time{},
		}
		s, err := CreateService(service)
		if err != nil {
			t.Errorf("Error when creating service: %v", err)
		}
		if s.ID == 0 {
			t.Errorf("Service ID not set")
		}
		if s.Version != "1.1.0" {
			t.Errorf("Service version not updated")
		}
	})
}

func TestGetServicesLocal(t *testing.T) {
	ResetLocalDB()
	t.Run("Test Get All Services 1", func(t *testing.T) {
		services := GetAllServices()
		if len(services) != 0 {
			t.Errorf("Services not empty")
		}
	})
	t.Run("Test Get All Services 2", func(t *testing.T) {
		_, _ = CreateService(model.Service{
			Name:        "Service 1",
			Version:     "1.0.0",
			Endpoint:    "http://localhost:8080",
			HealthCheck: "http://localhost:8080/health",
		})
		services := GetAllServices()
		if len(services) != 1 {
			t.Errorf("Services not 1")
		}
	})
	t.Run("Test Get Service By ID", func(t *testing.T) {
		s, _ := CreateService(model.Service{
			Name:        "Service 1",
			Version:     "1.0.0",
			Endpoint:    "http://localhost:8081",
			HealthCheck: "http://localhost:8081/health",
		})
		s = GetServiceByID(s.ID)
		if s.ID == 0 {
			t.Errorf("Service not found")
		}
	})
	t.Run("Test Get Service By Name", func(t *testing.T) {
		s := GetServicesByName("service_1")
		if len(s) != 2 {
			t.Errorf("Service not found")
		}
	})
	t.Run("Test Get Num Services", func(t *testing.T) {
		if GetNumServices() != 2 {
			t.Errorf("Services not found")
		}
	})
	t.Run("Test Get Unique Num Services", func(t *testing.T) {
		if GetNumUniqueServices() != 1 {
			t.Errorf("Services not found")
		}
	})
}

func TestRemoveServiceLocal(t *testing.T) {
	ResetLocalDB()
	t.Run("Test Remove Service", func(t *testing.T) {
		s, _ := CreateService(model.Service{
			Name:        "Service 1",
			Version:     "1.0.0",
			Endpoint:    "http://localhost:8080",
			HealthCheck: "http://localhost:8080/health",
		})
		s, _ = CreateService(s)
		RemoveService(s.ID)
	})
}

func TestCreateServiceSQL(t *testing.T) {
	ResetSQLDB()
	t.Run("Test Create Service", func(t *testing.T) {
		service := model.Service{
			Name:        "Service 1",
			Version:     "1.0.0",
			Endpoint:    "http://localhost:8080",
			HealthCheck: "http://localhost:8080/health",
			UpdatedAt:   time.Time{},
			CreatedAt:   time.Time{},
		}
		s, err := CreateService(service)
		if err != nil {
			t.Errorf("Error when creating service: %v", err)
		}
		if s.ID == 0 {
			t.Errorf("Service ID not set")
		}
	})
	t.Run("Test Update Service", func(t *testing.T) {
		service := model.Service{
			Name:        "Service 1",
			Version:     "1.1.0",
			Endpoint:    "http://localhost:8080",
			HealthCheck: "http://localhost:8080/health",
			UpdatedAt:   time.Time{},
			CreatedAt:   time.Time{},
		}
		s, err := CreateService(service)
		if err != nil {
			t.Errorf("Error when creating service: %v", err)
		}
		if s.ID == 0 {
			t.Errorf("Service ID not set")
		}
		if s.Version != "1.1.0" {
			t.Errorf("Service version not updated")
		}
	})
}

func TestGetServicesSQL(t *testing.T) {
	ResetSQLDB()
	t.Run("Test Get All Services 1", func(t *testing.T) {
		database.DB.Where("1 = 1").Delete(&model.Service{})
		services := GetAllServices()
		if len(services) != 0 {
			t.Errorf("Services not empty")
		}
	})
	t.Run("Test Get All Services 2", func(t *testing.T) {
		_, _ = CreateService(model.Service{
			Name:        "Service 1",
			Version:     "1.0.0",
			Endpoint:    "http://localhost:8080",
			HealthCheck: "http://localhost:8080/health",
		})
		services := GetAllServices()
		if len(services) == 0 {
			t.Errorf("Services not 1")
		}
	})
	t.Run("Test Get Service By ID", func(t *testing.T) {
		s, _ := CreateService(model.Service{
			Name:        "Service 1",
			Version:     "1.0.0",
			Endpoint:    "http://localhost:8081",
			HealthCheck: "http://localhost:8081/health",
		})
		s = GetServiceByID(s.ID)
		if s.ID == 0 {
			t.Errorf("Service not found")
		}
	})
	t.Run("Test Get Service By Name", func(t *testing.T) {
		s := GetServicesByName("service_1")
		if len(s) != 2 {
			t.Errorf("Service not found")
		}
	})
	t.Run("Test Get Num Services", func(t *testing.T) {
		if GetNumServices() != 2 {
			t.Errorf("Services not found")
		}
	})
	t.Run("Test Get Unique Num Services", func(t *testing.T) {
		if GetNumUniqueServices() != 1 {
			t.Errorf("Services not found")
		}
	})
}

func TestRemoveServiceSQL(t *testing.T) {
	ResetSQLDB()
	t.Run("Test Remove Service", func(t *testing.T) {
		s, _ := CreateService(model.Service{
			Name:        "Service 1",
			Version:     "1.0.0",
			Endpoint:    "http://localhost:8080",
			HealthCheck: "http://localhost:8080/health",
		})
		s, _ = CreateService(s)
		RemoveService(s.ID)
	})
}

func TestRegisterSelf(t *testing.T) {
	ResetLocalDB()
	RegisterSelf()
}

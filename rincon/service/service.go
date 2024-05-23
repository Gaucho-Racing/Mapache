package service

import (
	"fmt"
	"rincon/config"
	"rincon/database"
	"rincon/model"
	"rincon/utils"
	"time"
)

func GetAllServices() []model.Service {
	services := make([]model.Service, 0)
	if config.StorageMode == "sql" {
		database.DB.Find(&services)
	} else {
		services = database.Local.Services
	}
	return services
}

func GetNumServices() int {
	if config.StorageMode == "sql" {
		var count int64
		database.DB.Model(&model.Service{}).Count(&count)
		return int(count)
	} else {
		return len(database.Local.Services)
	}
}

func GetNumUniqueServices() int {
	if config.StorageMode == "sql" {
		var services []model.Service
		database.DB.Distinct("name").Find(&services)
		return len(services)
	} else {
		unique := make(map[string]bool)
		for _, s := range database.Local.Services {
			unique[s.Name] = true
		}
		return len(unique)
	}
}

func GetServiceByID(id int) model.Service {
	var service model.Service
	if config.StorageMode == "sql" {
		database.DB.First(&service, id)
	} else {
		for _, s := range database.Local.Services {
			if s.ID == id {
				service = s
				break
			}
		}
	}
	return service
}

func GetServicesByName(name string) []model.Service {
	services := make([]model.Service, 0)
	if config.StorageMode == "sql" {
		database.DB.Where("name = ?", name).Find(&services)
	} else {
		for _, s := range database.Local.Services {
			if s.Name == name {
				services = append(services, s)
			}
		}
	}
	return services
}

func GetServiceByEndpoint(endpoint string) model.Service {
	var service model.Service
	if config.StorageMode == "sql" {
		database.DB.Where("endpoint = ?", endpoint).First(&service)
	} else {
		for _, s := range database.Local.Services {
			if s.Endpoint == endpoint {
				service = s
				break
			}
		}
	}
	return service
}

func CreateService(service model.Service) (model.Service, error) {
	if service.Name == "" {
		return model.Service{}, fmt.Errorf("service name cannot be empty")
	} else if service.Version == "" {
		return model.Service{}, fmt.Errorf("service version cannot be empty")
	} else if service.Endpoint == "" {
		return model.Service{}, fmt.Errorf("service endpoint cannot be empty")
	} else if service.HealthCheck == "" {
		return model.Service{}, fmt.Errorf("service health check cannot be empty")
	}
	service.Name = utils.NormalizeName(service.Name)
	existing := GetServiceByEndpoint(service.Endpoint)
	if config.StorageMode == "sql" {
		if existing.Endpoint != "" {
			service.ID = existing.ID
			database.DB.Model(&service).Where("endpoint = ?", service.Endpoint).Updates(service)
		} else {
			service.ID = utils.GenerateID(0)
			database.DB.Create(&service)
		}
	} else {
		if existing.Endpoint != "" {
			service.ID = existing.ID
			service.CreatedAt = existing.CreatedAt
			service.UpdatedAt = time.Now()
			for i, s := range database.Local.Services {
				if s.ID == existing.ID {
					database.Local.Services[i] = service
					break
				}
			}
		} else {
			service.ID = utils.GenerateID(0)
			service.UpdatedAt = time.Now()
			service.CreatedAt = time.Now()
			database.Local.Services = append(database.Local.Services, service)
		}
	}
	newService := GetServiceByEndpoint(service.Endpoint)
	utils.SugarLogger.Infof("registered service (%d) %s at %s", newService.ID, newService.Name, newService.Endpoint)
	return newService, nil
}

func RemoveService(id int) {
	if config.StorageMode == "sql" {
		database.DB.Delete(&model.Service{}, id)
		return
	} else {
		for i, s := range database.Local.Services {
			if s.ID == id {
				database.Local.Services = append(database.Local.Services[:i], database.Local.Services[i+1:]...)
				break
			}
		}
	}
}

func RegisterSelf() {
	service := model.Service{
		Name:        "Rincon",
		Version:     config.Version,
		Endpoint:    "http://localhost:" + config.Port,
		HealthCheck: "http://localhost:" + config.Port + "/rincon/ping",
		UpdatedAt:   time.Now(),
		CreatedAt:   time.Now(),
	}
	_, err := CreateService(service)
	if err != nil {
		utils.SugarLogger.Errorf("Error when creating service: %v", err)
	}
	for _, route := range []string{"/rincon/ping", "/rincon/services", "/rincon/services/**", "/rincon/routes", "/rincon/routes/**", "/rincon/match/**"} {
		err := CreateRoute(model.Route{
			Route:       route,
			ServiceName: "Rincon",
			CreatedAt:   time.Now(),
		})
		if err != nil {
			utils.SugarLogger.Errorf("Error when creating route: %v", err)
		}
	}
}

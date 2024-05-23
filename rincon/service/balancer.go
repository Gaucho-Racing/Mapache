package service

import (
	"math/rand"
	"rincon/model"
)

func LoadBalance(serviceName string, balancer string) model.Service {
	var service model.Service
	services := GetServicesByName(serviceName)
	if len(services) == 0 {
		return service
	}
	if balancer == "random" {
		service = RandomSelector(services)
	}
	return service
}

func RandomSelector(services []model.Service) model.Service {
	return services[rand.Intn(len(services))]
}

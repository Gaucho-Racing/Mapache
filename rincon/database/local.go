package database

import "rincon/model"

var Local *LocalStore

type LocalStore struct {
	Services            []model.Service
	ServiceDependencies []model.ServiceDependency
	Routes              []model.Route
}

func InitializeLocal() {
	Local = &LocalStore{
		Services:            make([]model.Service, 0),
		ServiceDependencies: make([]model.ServiceDependency, 0),
		Routes:              make([]model.Route, 0),
	}
}

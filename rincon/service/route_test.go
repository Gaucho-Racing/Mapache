package service

import (
	"rincon/config"
	"rincon/model"
	"testing"
)

func TestCreateRouteLocal(t *testing.T) {
	ResetLocalDB()
	t.Run("Test No Route", func(t *testing.T) {
		route := model.Route{
			ServiceName: "Service 1",
		}
		err := CreateRoute(route)
		if err == nil {
			t.Errorf("No error when creating route: %v", err)
		}
	})
	t.Run("Test No Service Name", func(t *testing.T) {
		route := model.Route{
			Route: "/test",
		}
		err := CreateRoute(route)
		if err == nil {
			t.Errorf("No error when creating route: %v", err)
		}
	})
	t.Run("Test Route Ends With Slash", func(t *testing.T) {
		route := model.Route{
			Route:       "/test/",
			ServiceName: "Service 1",
		}
		err := CreateRoute(route)
		if err == nil {
			t.Errorf("No error when creating route: %v", err)
		}
	})
	t.Run("Test Create Route", func(t *testing.T) {
		route := model.Route{
			Route:       "/test",
			ServiceName: "Service 1",
		}
		err := CreateRoute(route)
		if err != nil {
			t.Errorf("Error when creating route: %v", err)
		}
	})
	t.Run("Test Route Exists 1", func(t *testing.T) {
		route := model.Route{
			Route:       "/test",
			ServiceName: "Service 1",
		}
		config.OverwriteRoutes = "true"
		err := CreateRoute(route)
		if err != nil {
			t.Errorf("Error when creating route: %v", err)
		}
	})
	t.Run("Test Route Exists 2", func(t *testing.T) {
		route := model.Route{
			Route:       "/test",
			ServiceName: "Service 1",
		}
		config.OverwriteRoutes = "false"
		err := CreateRoute(route)
		if err != nil {
			t.Errorf("Error when creating route: %v", err)
		}
	})
	t.Run("Test Route Exists 3", func(t *testing.T) {
		route := model.Route{
			Route:       "/test",
			ServiceName: "Service 2",
		}
		config.OverwriteRoutes = "false"
		err := CreateRoute(route)
		if err == nil {
			t.Errorf("No error when creating route: %v", err)
		}
	})
	t.Run("Test Route Exists 4", func(t *testing.T) {
		route := model.Route{
			Route:       "/test",
			ServiceName: "Service 2",
		}
		config.OverwriteRoutes = "true"
		err := CreateRoute(route)
		if err != nil {
			t.Errorf("Error when creating route: %v", err)
		}
	})
}

func TestGetRoutesLocal(t *testing.T) {
	ResetLocalDB()
	t.Run("Test Get All Routes", func(t *testing.T) {
		routes := GetAllRoutes()
		if len(routes) != 0 {
			t.Errorf("Expected length to be 0")
		}
	})
	t.Run("Test Get Num Routes", func(t *testing.T) {
		CreateRoute(model.Route{
			Route:       "/test",
			ServiceName: "Service 1",
		})
		num := GetNumRoutes()
		if num == 0 {
			t.Errorf("No routes found")
		}
	})
	t.Run("Test Get Route By ID", func(t *testing.T) {
		route := GetRouteByID("/test")
		if route.Route != "/test" {
			t.Errorf("No route found")
		}
	})
	t.Run("Test Get Routes By Service Name", func(t *testing.T) {
		routes := GetRoutesByServiceName("Service 1")
		if len(routes) == 0 {
			t.Errorf("No routes found")
		}
	})
}

func TestCreateRouteSQL(t *testing.T) {
	ResetSQLDB()
	t.Run("Test Create Route", func(t *testing.T) {
		route := model.Route{
			Route:       "/test",
			ServiceName: "Service 1",
		}
		err := CreateRoute(route)
		if err != nil {
			t.Errorf("Error when creating route: %v", err)
		}
	})
	t.Run("Test Route Exists 1", func(t *testing.T) {
		route := model.Route{
			Route:       "/test",
			ServiceName: "Service 1",
		}
		config.OverwriteRoutes = "true"
		err := CreateRoute(route)
		if err != nil {
			t.Errorf("Error when creating route: %v", err)
		}
	})
	t.Run("Test Route Exists 2", func(t *testing.T) {
		route := model.Route{
			Route:       "/test",
			ServiceName: "Service 1",
		}
		config.OverwriteRoutes = "false"
		err := CreateRoute(route)
		if err != nil {
			t.Errorf("Error when creating route: %v", err)
		}
	})
	t.Run("Test Route Exists 3", func(t *testing.T) {
		route := model.Route{
			Route:       "/test",
			ServiceName: "Service 2",
		}
		config.OverwriteRoutes = "false"
		err := CreateRoute(route)
		if err == nil {
			t.Errorf("No error when creating route: %v", err)
		}
	})
	t.Run("Test Route Exists 4", func(t *testing.T) {
		route := model.Route{
			Route:       "/test",
			ServiceName: "Service 2",
		}
		config.OverwriteRoutes = "true"
		err := CreateRoute(route)
		if err != nil {
			t.Errorf("Error when creating route: %v", err)
		}
	})
}

func TestGetRoutesSQL(t *testing.T) {
	ResetSQLDB()
	t.Run("Test Get All Routes", func(t *testing.T) {
		routes := GetAllRoutes()
		if len(routes) != 0 {
			t.Errorf("Expected length to be 0")
		}
	})
	t.Run("Test Get Num Routes", func(t *testing.T) {
		CreateRoute(model.Route{
			Route:       "/test",
			ServiceName: "Service 1",
		})
		num := GetNumRoutes()
		if num == 0 {
			t.Errorf("No routes found")
		}
	})
	t.Run("Test Get Route By ID", func(t *testing.T) {
		route := GetRouteByID("/test")
		if route.Route != "/test" {
			t.Errorf("No route found")
		}
	})
	t.Run("Test Get Routes By Service Name", func(t *testing.T) {
		routes := GetRoutesByServiceName("Service 1")
		if len(routes) == 0 {
			t.Errorf("No routes found")
		}
	})
}

func TestMatchRoute(t *testing.T) {
	ResetLocalDB()
	CreateService(model.Service{
		Name:        "Montecito",
		Version:     "1.4.2",
		Endpoint:    "http://localhost:10312",
		HealthCheck: "http://localhost:10312/health",
	})
	CreateService(model.Service{
		Name:        "Lacumbre",
		Version:     "2.7.9",
		Endpoint:    "http://localhost:10313",
		HealthCheck: "http://localhost:10313/health",
	})
	CreateRoute(model.Route{
		Route:       "/service/ping",
		ServiceName: "Montecito",
	})
	CreateRoute(model.Route{
		Route:       "/service/*/awesome",
		ServiceName: "Montecito",
	})
	CreateRoute(model.Route{
		Route:       "/service/**",
		ServiceName: "Lacumbre",
	})
	CreateRoute(model.Route{
		Route:       "/no/service",
		ServiceName: "No Service",
	})
	t.Run("Test Match Route", func(t *testing.T) {
		route := MatchRoute("service/ping")
		if route.Name != "montecito" {
			t.Errorf("MatchRoute returned wrong service")
		}
	})
	t.Run("Test Match Route 2", func(t *testing.T) {
		route := MatchRoute("service/1/awesome")
		if route.Name != "montecito" {
			t.Errorf("MatchRoute returned wrong service")
		}
	})
	t.Run("Test Match Route 3", func(t *testing.T) {
		route := MatchRoute("service/1/awesome/2")
		if route.Name != "lacumbre" {
			t.Errorf("MatchRoute returned wrong service")
		}
	})
	t.Run("Test Match Route 4", func(t *testing.T) {
		route := MatchRoute("epic/awesome")
		if route.Name != "" {
			t.Errorf("MatchRoute returned wrong service")
		}
	})
	t.Run("Test Match Route 5", func(t *testing.T) {
		route := MatchRoute("no/service")
		if route.Name != "" {
			t.Errorf("MatchRoute returned wrong service")
		}
	})
}

func TestPrintRouteGraph(t *testing.T) {
	ResetLocalDB()
	CreateService(model.Service{
		Name:        "Montecito",
		Version:     "1.4.2",
		Endpoint:    "http://localhost:10312",
		HealthCheck: "http://localhost:10312/health",
	})
	CreateService(model.Service{
		Name:        "Lacumbre",
		Version:     "2.7.9",
		Endpoint:    "http://localhost:10313",
		HealthCheck: "http://localhost:10313/health",
	})
	CreateRoute(model.Route{
		Route:       "/service/ping",
		ServiceName: "Montecito",
	})
	CreateRoute(model.Route{
		Route:       "/service/*/awesome",
		ServiceName: "Montecito",
	})
	CreateRoute(model.Route{
		Route:       "/service/**",
		ServiceName: "Lacumbre",
	})
	t.Run("Test Print Route Graph", func(t *testing.T) {
		PrintRouteGraph()
	})
}

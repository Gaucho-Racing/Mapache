package api

import (
	jsoniter "github.com/json-iterator/go"
	"net/http"
	"net/http/httptest"
	"rincon/model"
	"rincon/service"
	"strconv"
	"strings"
	"testing"
)

func TestGetAllServices(t *testing.T) {
	router := SetupRouter()
	InitializeRoutes(router)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/rincon/services", nil)
	router.ServeHTTP(w, req)
	if w.Code != 200 {
		t.Errorf("Expected status code 200, got %v", w.Code)
	}
}

func TestGetService(t *testing.T) {
	router := SetupRouter()
	InitializeRoutes(router)
	t.Run("Get Service By ID", func(t *testing.T) {
		s, _ := service.CreateService(model.Service{
			Name:        "montecito",
			Version:     "1.0.0",
			Endpoint:    "http://localhost:8080",
			HealthCheck: "http://localhost:8080/health",
		})
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/rincon/services/"+strconv.Itoa(s.ID), nil)
		router.ServeHTTP(w, req)
		if w.Code != 200 {
			t.Errorf("Expected status code 200, got %v", w.Code)
		}
	})
	t.Run("Get Service By Name", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/rincon/services/rincon", nil)
		router.ServeHTTP(w, req)
		if w.Code != 200 {
			t.Errorf("Expected status code 200, got %v", w.Code)
		}
	})
	t.Run("Get Service Not Found", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/rincon/services/12345", nil)
		router.ServeHTTP(w, req)
		if w.Code != 404 {
			t.Errorf("Expected status code 404, got %v", w.Code)
		}
	})
}

func TestCreateService(t *testing.T) {
	router := SetupRouter()
	InitializeRoutes(router)
	t.Run("Create Service", func(t *testing.T) {
		s := model.Service{
			Name:        "montecito",
			Version:     "1.0.0",
			Endpoint:    "http://localhost:8080",
			HealthCheck: "http://localhost:8080/health",
		}
		json, _ := jsoniter.MarshalToString(s)
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/rincon/services", strings.NewReader(json))
		req.SetBasicAuth("admin", "admin")
		router.ServeHTTP(w, req)
		if w.Code != 200 {
			t.Errorf("Expected status code 200, got %v", w.Code)
		}
	})
	t.Run("Invalid Body", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/rincon/services", strings.NewReader("{\"name\": 123}"))
		req.SetBasicAuth("admin", "admin")
		router.ServeHTTP(w, req)
		if w.Code != 400 {
			t.Errorf("Expected status code 400, got %v", w.Code)
		}
	})
	t.Run("Create Service Error", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/rincon/services", strings.NewReader("{\"name\": \"rincon\"}"))
		req.SetBasicAuth("admin", "admin")
		router.ServeHTTP(w, req)
		if w.Code != 500 {
			t.Errorf("Expected status code 500, got %v", w.Code)
		}
	})
}

func TestRemoveService(t *testing.T) {
	router := SetupRouter()
	InitializeRoutes(router)
	t.Run("Remove Service", func(t *testing.T) {
		s, _ := service.CreateService(model.Service{
			Name:        "montecito",
			Version:     "1.0.0",
			Endpoint:    "http://localhost:8080",
			HealthCheck: "http://localhost:8080/health",
		})
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("DELETE", "/rincon/services/"+strconv.Itoa(s.ID), nil)
		req.SetBasicAuth("admin", "admin")
		router.ServeHTTP(w, req)
		if w.Code != 200 {
			t.Errorf("Expected status code 200, got %v", w.Code)
		}
	})
	t.Run("Remove Service Not Found", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("DELETE", "/rincon/services/bruh", nil)
		req.SetBasicAuth("admin", "admin")
		router.ServeHTTP(w, req)
		if w.Code != 400 {
			t.Errorf("Expected status code 400, got %v", w.Code)
		}
	})
}

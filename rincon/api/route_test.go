package api

import (
	jsoniter "github.com/json-iterator/go"
	"net/http"
	"net/http/httptest"
	"rincon/model"
	"strings"
	"testing"
)

func TestGetAllRoutes(t *testing.T) {
	router := SetupRouter()
	InitializeRoutes(router)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/rincon/routes", nil)
	router.ServeHTTP(w, req)
	if w.Code != 200 {
		t.Errorf("Expected status code 200, got %v", w.Code)
	}
}

func TestGetRoute(t *testing.T) {
	router := SetupRouter()
	InitializeRoutes(router)
	t.Run("Get Route By ID", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/rincon/routes/rincon<->ping", nil)
		router.ServeHTTP(w, req)
		if w.Code != 200 {
			t.Errorf("Expected status code 200, got %v", w.Code)
		}
	})
	t.Run("Get Route Not Found", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/rincon/route/rincon<->bruh", nil)
		router.ServeHTTP(w, req)
		if w.Code != 404 {
			t.Errorf("Expected status code 404, got %v", w.Code)
		}
	})
}

func TestGetRoutesForService(t *testing.T) {
	router := SetupRouter()
	InitializeRoutes(router)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/rincon/services/rincon/routes", nil)
	router.ServeHTTP(w, req)
	if w.Code != 200 {
		t.Errorf("Expected status code 200, got %v", w.Code)
	}
}

func TestCreateRoute(t *testing.T) {
	router := SetupRouter()
	InitializeRoutes(router)
	t.Run("Create Route", func(t *testing.T) {
		r := model.Route{
			Route:       "/rincon/epic",
			ServiceName: "rincon",
		}
		json, _ := jsoniter.MarshalToString(r)
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/rincon/routes", strings.NewReader(json))
		req.SetBasicAuth("admin", "admin")
		router.ServeHTTP(w, req)
		if w.Code != 200 {
			t.Errorf("Expected status code 200, got %v", w.Code)
		}
	})
	t.Run("Invalid Body", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/rincon/routes", strings.NewReader("{\"service_name\": 123}"))
		req.SetBasicAuth("admin", "admin")
		router.ServeHTTP(w, req)
		if w.Code != 400 {
			t.Errorf("Expected status code 400, got %v", w.Code)
		}
	})
	t.Run("Create Route Error", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/rincon/routes", strings.NewReader("{\"service_name\": \"rincon\"}"))
		req.SetBasicAuth("admin", "admin")
		router.ServeHTTP(w, req)
		if w.Code != 500 {
			t.Errorf("Expected status code 500, got %v", w.Code)
		}
	})
}

func TestMatchRoute(t *testing.T) {
	router := SetupRouter()
	InitializeRoutes(router)
	t.Run("Match Route", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/rincon/match/rincon<->ping", nil)
		router.ServeHTTP(w, req)
		if w.Code != 200 {
			t.Errorf("Expected status code 200, got %v", w.Code)
		}
	})
	t.Run("Match Route Not Found", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/rincon/match/rincon<->bruh", nil)
		router.ServeHTTP(w, req)
		if w.Code != 404 {
			t.Errorf("Expected status code 404, got %v", w.Code)
		}
	})
}

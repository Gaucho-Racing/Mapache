package api

import (
	"net/http"
	"net/http/httptest"
	"os"
	"rincon/database"
	"rincon/service"
	"rincon/utils"
	"testing"
)

func TestMain(m *testing.M) {
	utils.InitializeLogger()
	utils.VerifyConfig()
	database.InitializeLocal()
	service.RegisterSelf()
	exitVal := m.Run()
	os.Exit(exitVal)
}

func TestAuthMiddleware(t *testing.T) {
	router := SetupRouter()
	InitializeRoutes(router)
	t.Run("Test No Auth", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/rincon/services", nil)
		router.ServeHTTP(w, req)
		if w.Code != 401 {
			t.Errorf("Expected status code 401, got %v", w.Code)
		}
	})
	t.Run("Test Invalid Auth", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/rincon/services", nil)
		req.SetBasicAuth("admin", "wrongpassword")
		router.ServeHTTP(w, req)
		if w.Code != 401 {
			t.Errorf("Expected status code 401, got %v", w.Code)
		}
	})
}

package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestPing(t *testing.T) {
	router := SetupRouter()
	InitializeRoutes(router)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/rincon/ping", nil)
	router.ServeHTTP(w, req)
	if w.Code != 200 {
		t.Errorf("Expected status code 200, got %v", w.Code)
	}
}

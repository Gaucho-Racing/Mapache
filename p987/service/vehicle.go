package service

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gaucho-racing/mapache/p987/config"
	"github.com/gaucho-racing/mapache/p987/pkg/kerbecs"
	"github.com/gaucho-racing/mapache/p987/pkg/logger"

	"github.com/gaucho-racing/mapache/mapache-go/v3"
)

type uploadKeyCacheEntry struct {
	UploadKey int
	Found     bool
	ExpiresAt time.Time
}

var uploadKeyCache sync.Map

// missTTL keeps a failed lookup cached briefly so a vehicle service
// outage doesn't turn every inbound frame into an HTTP request.
const missTTL = time.Minute

func ValidateUploadKey(vehicleID string, key int) bool {
	if config.SkipAuthCheck {
		return true
	}

	if entry, ok := uploadKeyCache.Load(vehicleID); ok {
		cached := entry.(uploadKeyCacheEntry)
		if time.Now().Before(cached.ExpiresAt) {
			if !cached.Found {
				return false
			}
			return cached.UploadKey == key
		}
	}

	vehicle, ok := fetchVehicle(vehicleID)
	if !ok {
		uploadKeyCache.Store(vehicleID, uploadKeyCacheEntry{
			Found:     false,
			ExpiresAt: time.Now().Add(missTTL),
		})
		return false
	}

	hitTTL, err := strconv.Atoi(config.VehicleUploadKeyCacheTTL)
	if err != nil {
		hitTTL = 600
	}
	uploadKeyCache.Store(vehicleID, uploadKeyCacheEntry{
		UploadKey: vehicle.UploadKey,
		Found:     true,
		ExpiresAt: time.Now().Add(time.Duration(hitTTL) * time.Second),
	})

	if vehicle.UploadKey != key {
		logger.SugarLogger.Infof("Upload key mismatch for vehicle %s: expected %d, got %d", vehicleID, vehicle.UploadKey, key)
		return false
	}
	return true
}

func fetchVehicle(vehicleID string) (mapache.Vehicle, bool) {
	path := fmt.Sprintf("/api/vehicles/%s", vehicleID)
	upstreamURL, err := kerbecs.Resolve("GET", path)
	if err != nil {
		logger.SugarLogger.Warnf("Failed to resolve vehicle route via kerbecs: %v", err)
		return mapache.Vehicle{}, false
	}

	resp, err := http.Get(upstreamURL)
	if err != nil {
		logger.SugarLogger.Warnf("Failed to fetch vehicle %s: %v", vehicleID, err)
		return mapache.Vehicle{}, false
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		logger.SugarLogger.Warnf("Vehicle service returned %d for vehicle %s", resp.StatusCode, vehicleID)
		return mapache.Vehicle{}, false
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		logger.SugarLogger.Warnf("Failed to read vehicle response for %s: %v", vehicleID, err)
		return mapache.Vehicle{}, false
	}

	var vehicle mapache.Vehicle
	if err := json.Unmarshal(body, &vehicle); err != nil {
		logger.SugarLogger.Warnf("Failed to unmarshal vehicle %s: %v", vehicleID, err)
		return mapache.Vehicle{}, false
	}
	return vehicle, true
}

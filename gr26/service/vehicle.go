package service

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gaucho-racing/mapache/gr26/config"
	"github.com/gaucho-racing/mapache/gr26/pkg/logger"
	"github.com/gaucho-racing/mapache/gr26/pkg/rincon"

	"github.com/gaucho-racing/mapache/mapache-go/v3"
)

type uploadKeyCacheEntry struct {
	UploadKey int
	Found     bool
	ExpiresAt time.Time
}

var uploadKeyCache sync.Map

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

	if rincon.RinconClient == nil {
		logger.SugarLogger.Warnf("Rincon client is nil, cannot validate upload key for vehicle %s", vehicleID)
		return false
	}

	hitTTL, err := strconv.Atoi(config.VehicleUploadKeyCacheTTL)
	if err != nil {
		hitTTL = 600
	}

	svc, err := rincon.RinconClient.MatchRoute(fmt.Sprintf("/vehicles/%s", vehicleID), "GET")
	if err != nil {
		logger.SugarLogger.Warnf("Failed to resolve vehicle service via Rincon: %v", err)
		uploadKeyCache.Store(vehicleID, uploadKeyCacheEntry{
			Found:     false,
			ExpiresAt: time.Now().Add(time.Minute),
		})
		return false
	}

	resp, err := http.Get(fmt.Sprintf("%s/vehicles/%s", svc.Endpoint, vehicleID))
	if err != nil {
		logger.SugarLogger.Warnf("Failed to fetch vehicle %s: %v", vehicleID, err)
		uploadKeyCache.Store(vehicleID, uploadKeyCacheEntry{
			Found:     false,
			ExpiresAt: time.Now().Add(time.Minute),
		})
		return false
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		logger.SugarLogger.Warnf("Vehicle service returned %d for vehicle %s", resp.StatusCode, vehicleID)
		uploadKeyCache.Store(vehicleID, uploadKeyCacheEntry{
			Found:     false,
			ExpiresAt: time.Now().Add(time.Minute),
		})
		return false
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		logger.SugarLogger.Warnf("Failed to read vehicle response for %s: %v", vehicleID, err)
		uploadKeyCache.Store(vehicleID, uploadKeyCacheEntry{
			Found:     false,
			ExpiresAt: time.Now().Add(time.Minute),
		})
		return false
	}

	var vehicle mapache.Vehicle
	if err := json.Unmarshal(body, &vehicle); err != nil {
		logger.SugarLogger.Warnf("Failed to unmarshal vehicle %s: %v", vehicleID, err)
		uploadKeyCache.Store(vehicleID, uploadKeyCacheEntry{
			Found:     false,
			ExpiresAt: time.Now().Add(time.Minute),
		})
		return false
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

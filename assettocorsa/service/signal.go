package service

import (
	"ac/database"
	"ac/utils"
	"fmt"

	"github.com/gaucho-racing/mapache-go"
)

// signalCallbacks is a list of functions that will be called when a signal is created or updated
var signalCallbacks = []func(signal mapache.Signal){}

// signalNotify fires all the callbacks in signalCallbacks with the provided signal
func signalNotify(signal mapache.Signal) {
	for _, callback := range signalCallbacks {
		callback(signal)
	}
}

// SubscribeSignals registers a function to be called when a signal is created or updated
func SubscribeSignals(callback func(signal mapache.Signal)) {
	signalCallbacks = append(signalCallbacks, callback)
}

func GetSignal(timestamp int, vehicleID string, name string) mapache.Signal {
	var signal mapache.Signal
	database.DB.Where("timestamp = ?", timestamp).Where("vehicle_id = ?", vehicleID).Where("name = ?", name).First(&signal)
	return signal
}

func CreateSignal(signal mapache.Signal) error {
	if signal.Timestamp == 0 {
		return fmt.Errorf("signal timestamp cannot be 0")
	}
	if signal.VehicleID == "" {
		return fmt.Errorf("signal vehicle id cannot be empty")
	}
	if signal.Name == "" {
		return fmt.Errorf("signal name cannot be empty")
	}
	if result := database.DB.Create(&signal); result.Error != nil {
		return result.Error
	}
	utils.SugarLogger.Infow("[DB] Signal inserted",
		"timestamp", signal.Timestamp,
		"vehicle_id", signal.VehicleID,
		"name", signal.Name,
	)
	go signalNotify(signal)
	return nil
}

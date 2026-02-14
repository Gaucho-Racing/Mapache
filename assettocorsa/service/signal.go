package service

import (
	"ac/database"
	"fmt"
	"time"

	"github.com/gaucho-racing/mapache-go"
)

var signalBatch *database.BatchInserter[mapache.Signal]

func InitSignalBatch() {
	signalBatch = database.NewBatchInserter[mapache.Signal]("signals", 5000, 1*time.Second)
}

func StopSignalBatch() {
	signalBatch.Stop()
}

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
	signalBatch.Add(signal)
	go signalNotify(signal)
	return nil
}

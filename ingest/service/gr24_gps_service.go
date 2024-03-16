package service

import (
	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/google/uuid"
	"ingest/model"
	"ingest/utils"
	"math"
	"os"
	"strconv"
	"time"
)

var gpsCallbacks []func(gps model.GR24Gps)

func gpsNotify(gps model.GR24Gps) {
	for _, callback := range gpsCallbacks {
		callback(gps)
	}
}

func GR24GpsSubscribe(callback func(gps model.GR24Gps)) {
	gpsCallbacks = append(gpsCallbacks, callback)
}

func GR24InitializeGpsIngest() {
	callback := func(client mqtt.Client, msg mqtt.Message) {
		utils.SugarLogger.Infoln("[MQ] Received gps frame")
		gps := parseGps(msg.Payload())
		if gps.ID != "" {
			gpsNotify(gps)
			err := CreateGps(gps)
			if err != nil {
				utils.SugarLogger.Errorln(err)
			}
		}
	}
	RabbitClient.Subscribe("gr24/gps", 0, callback)
}

// parseGps function takes in a byte array and returns a Gps struct
func parseGps(data []byte) model.GR24Gps {
	var gps model.GR24Gps
	if len(data) != 8 {
		utils.SugarLogger.Warnln("Gps data length is not 8 bytes! Received: ", len(data))
		return gps
	}
	gps.ID = uuid.NewString()
	gps.Millis = int(time.Now().UnixMilli())
	// latitude is a 32-bit float
	lat32 := math.Float32frombits(uint32(data[0])<<24 | uint32(data[1])<<16 | uint32(data[2])<<8 | uint32(data[3]))
	// longitude is a 32-bit float
	long32 := math.Float32frombits(uint32(data[4])<<24 | uint32(data[5])<<16 | uint32(data[6])<<8 | uint32(data[7]))
	gps.Latitude = float64(lat32)
	gps.Longitude = float64(long32)
	gps = scaleGps(gps)
	return gps
}

func scaleGps(gps model.GR24Gps) model.GR24Gps {
	gps.Latitude = gps.Latitude * getGpsScale("Latitude")
	gps.Longitude = gps.Longitude * getGpsScale("Longitude")
	return gps
}

func getGpsScale(variable string) float64 {
	scaleVar := os.Getenv("SCALE_GR24_GPS_" + variable)
	if scaleVar != "" {
		scaleFloat, err := strconv.ParseFloat(scaleVar, 64)
		if err != nil {
			return 1
		}
		return scaleFloat
	}
	return 1
}

func CreateGps(gps model.GR24Gps) error {
	if result := DB.Create(&gps); result.Error != nil {
		return result.Error
	}
	return nil
}

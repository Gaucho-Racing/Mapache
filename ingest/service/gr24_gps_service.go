package service

import (
	"ingest/model"
	"ingest/utils"
	"os"
	"strconv"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/google/uuid"
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
	if len(data) != 16 {
		utils.SugarLogger.Warnln("Gps data length is not 16 bytes!")
		return gps
	}
	gps.ID = uuid.NewString()
	gps.Millis = int(time.Now().UnixMilli())
	gps.Latitude = float64(int(data[0])<<24 | int(data[1])<<16 | int(data[2])<<8 | int(data[3]))
	gps.Longitude = float64(int(data[4])<<24 | int(data[5])<<16 | int(data[6])<<8 | int(data[7]))
	gps = scale(gps)
	return gps
}

func scale(gps model.GR24Gps) model.GR24Gps {
	gps.Latitude = gps.Latitude * getScale("Latitude")
	gps.Longitude = gps.Longitude * getScale("Longitude")
	return gps
}

func getScale(variable string) float64 {
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

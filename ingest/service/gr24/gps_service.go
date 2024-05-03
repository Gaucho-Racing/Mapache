package gr24service

import (
	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/google/uuid"
	"ingest/database"
	gr24model "ingest/model/gr24"
	"ingest/rabbitmq"
	"ingest/service"
	"ingest/utils"
	"math"
	"time"
)

var gpsCallbacks []func(gps gr24model.GPS)

func gpsNotify(gps gr24model.GPS) {
	for _, callback := range gpsCallbacks {
		callback(gps)
	}
}

func GPSSubscribe(callback func(gps gr24model.GPS)) {
	gpsCallbacks = append(gpsCallbacks, callback)
}

func InitializeGPSIngest() {
	callback := func(client mqtt.Client, msg mqtt.Message) {
		utils.SugarLogger.Infoln("[MQ] Received gps frame")
		gps := parseGPS(msg.Payload())
		if gps.ID != "" {
			gpsNotify(gps)
			go func() {
				err := CreateGps(gps)
				if err != nil {
					utils.SugarLogger.Errorln(err)
				}
			}()
		}
	}
	rabbitmq.Client.Subscribe("gr24/gps", 0, callback)
}

func parseGPS(data []byte) gr24model.GPS {
	var gps gr24model.GPS
	if len(data) != 8 {
		utils.SugarLogger.Warnln("GPS data length is not 8 bytes! Received: ", len(data))
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
	gps = scaleGPS(gps)
	return gps
}

func scaleGPS(gps gr24model.GPS) gr24model.GPS {
	gps.Latitude = gps.Latitude * service.GetScaleEnvVar("GR24", "GPS", "Latitude")
	gps.Longitude = gps.Longitude * service.GetScaleEnvVar("GR24", "GPS", "Longitude")
	return gps
}

func CreateGps(gps gr24model.GPS) error {
	if result := database.DB.Create(&gps); result.Error != nil {
		return result.Error
	}
	return nil
}

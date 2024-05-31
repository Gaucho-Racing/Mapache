package service

import (
	"encoding/binary"
	"gr24/database"
	"gr24/model"
	"gr24/utils"
	"math"
	"strings"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/google/uuid"
)

var mobileCallbacks []func(mobile model.Mobile)

// mobileNotify calls all the functions registered to mobileCallbacks
func mobileNotify(mobile model.Mobile) {
	for _, callback := range mobileCallbacks {
		callback(mobile)
	}
}

// SubscribeMobile registers a function to be called when a new mobile is received
func SubscribeMobile(callback func(mobile model.Mobile)) {
	mobileCallbacks = append(mobileCallbacks, callback)
}

// MobileIngestCallback is the callback function for handling incoming mqtt mobile frames
var MobileIngestCallback = func(client mqtt.Client, msg mqtt.Message) {
	utils.SugarLogger.Infof("[MQ-%s] Received mobile frame", msg.Topic())
	mobile := MobileFromBytes(msg.Payload())
	if mobile.ID != "" {
		mobile.VehicleID = strings.Split(msg.Topic(), "/")[1]
		mobile = scaleMobile(mobile)
		utils.SugarLogger.Infoln(mobile)
		mobileNotify(mobile)
		go func() {
			err := CreateMobile(mobile)
			if err != nil {
				utils.SugarLogger.Errorln(err)
			}
		}()
	}
}

// MobileFromBytes converts a byte array to a mobile struct
// If the conversion fails, an empty mobile struct is returned
func MobileFromBytes(data []byte) model.Mobile {
	var mobile model.Mobile
	mobileFields := model.NewMobileNode()
	err := mobileFields.FillFromBytes(data)
	if err != nil {
		utils.SugarLogger.Errorln("Failed to parse mobile:", err)
		return mobile
	}
	mobile.ID = uuid.New().String()
	mobile.CreatedAt = time.Now()
	mobile.Latitude = math.Float64frombits(binary.LittleEndian.Uint64(data[:8]))
	mobile.Longitude = math.Float64frombits(binary.LittleEndian.Uint64(data[8:16]))
	mobile.Altitude = math.Float64frombits(binary.LittleEndian.Uint64(data[16:24]))
	mobile.Speed = math.Float64frombits(binary.LittleEndian.Uint64(data[24:32]))
	mobile.Heading = math.Float64frombits(binary.LittleEndian.Uint64(data[32:40]))
	mobile.AccelerometerX = math.Float64frombits(binary.LittleEndian.Uint64(data[40:48]))
	mobile.AccelerometerY = math.Float64frombits(binary.LittleEndian.Uint64(data[48:56]))
	mobile.AccelerometerZ = math.Float64frombits(binary.LittleEndian.Uint64(data[56:64]))
	mobile.GyroscopeX = math.Float64frombits(binary.LittleEndian.Uint64(data[64:72]))
	mobile.GyroscopeY = math.Float64frombits(binary.LittleEndian.Uint64(data[72:80]))
	mobile.GyroscopeZ = math.Float64frombits(binary.LittleEndian.Uint64(data[80:88]))
	mobile.MagnetometerX = math.Float64frombits(binary.LittleEndian.Uint64(data[88:96]))
	mobile.MagnetometerY = math.Float64frombits(binary.LittleEndian.Uint64(data[96:104]))
	mobile.MagnetometerZ = math.Float64frombits(binary.LittleEndian.Uint64(data[104:112]))
	mobile.Battery = int(data[112])
	mobile.Millis = int(binary.LittleEndian.Uint32(data[113:117]))
	return mobile
}

// scaleMobile does not scale (already scaled)
func scaleMobile(mobile model.Mobile) model.Mobile {
	return mobile
}

func CreateMobile(mobile model.Mobile) error {
	if result := database.DB.Create(&mobile); result.Error != nil {
		return result.Error
	}
	return nil
}

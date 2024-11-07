package service

import (
	"gr24/database"
	"gr24/model"
	"gr24/utils"
	"strings"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/google/uuid"
)

var wheelCallbacks []func(wheel model.Wheel)

// wheelNotify calls all the functions registered to wheelCallbacks
func wheelNotify(wheel model.Wheel) {
	for _, callback := range wheelCallbacks {
		callback(wheel)
	}
}

// SubscribeWheel registers a function to be called when a new wheel is received
func SubscribeWheel(callback func(wheel model.Wheel)) {
	wheelCallbacks = append(wheelCallbacks, callback)
}

// WheelIngestCallback is the callback function for handling incoming mqtt wheel frames
var WheelIngestCallback = func(client mqtt.Client, msg mqtt.Message) {
	utils.SugarLogger.Infof("[MQ-%s] Received wheel frame", msg.Topic())
	wheel := WheelFromBytes(msg.Payload())
	if wheel.ID != "" {
		wheel.VehicleID = strings.Split(msg.Topic(), "/")[1]
		wheel.Location = strings.Split(msg.Topic(), "/")[3]
		wheel = scaleWheel(wheel)
		utils.SugarLogger.Infoln(wheel)
		wheelNotify(wheel)
		go func() {
			err := CreateWheel(wheel)
			if err != nil {
				utils.SugarLogger.Errorln(err)
			}
		}()
	}
}

// WheelFromBytes converts a byte array to a wheel struct
// If the conversion fails, an empty wheel struct is returned
func WheelFromBytes(data []byte) model.Wheel {
	var wheel model.Wheel
	wheelFields := model.NewWheelNode()
	err := wheelFields.FillFromBytes(data)
	if err != nil {
		utils.SugarLogger.Errorln("Failed to parse wheel:", err)
		return wheel
	}
	wheel.ID = uuid.New().String()
	wheel.CreatedAt = utils.WithPrecision(time.Now())
	wheel.Suspension = wheelFields[0].Value
	wheel.WheelSpeed = float64(wheelFields[1].Value)
	wheel.AccelX = float64(wheelFields[3].Value)
	wheel.AccelY = float64(wheelFields[4].Value)
	wheel.AccelZ = float64(wheelFields[5].Value)
	wheel.GyroX = float64(wheelFields[7].Value)
	wheel.GyroY = float64(wheelFields[8].Value)
	wheel.GyroZ = float64(wheelFields[9].Value)
	wheel.BrakeTempOne = wheelFields[11].Value
	wheel.BrakeTempTwo = wheelFields[12].Value
	wheel.TireTempOne = wheelFields[14].Value
	wheel.TireTempTwo = wheelFields[15].Value
	wheel.Millis = wheelFields[17].Value
	return wheel
}

// scaleWheel does not scale the wheel values to be between 0 and 100
func scaleWheel(wheel model.Wheel) model.Wheel {
	return wheel
}

func CreateWheel(wheel model.Wheel) error {
	if result := database.DB.Create(&wheel); result.Error != nil {
		return result.Error
	}
	return nil
}

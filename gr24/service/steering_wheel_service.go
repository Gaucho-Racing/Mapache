package service

import (
	"gr24/database"
	"gr24/model"
	"gr24/utils"
	"strings"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/google/uuid"
)

var steeringWheelCallbacks []func(steeringWheel model.SteeringWheel)

// steeringWheelNotify calls all the functions registered to steeringWheelCallbacks
func steeringWheelNotify(steeringWheel model.SteeringWheel) {
	for _, callback := range steeringWheelCallbacks {
		callback(steeringWheel)
	}
}

// SubscribeSteeringWheel registers a function to be called when a new steeringWheel is received
func SubscribeSteeringWheel(callback func(steeringWheel model.SteeringWheel)) {
	steeringWheelCallbacks = append(steeringWheelCallbacks, callback)
}

// SteeringWheelIngestCallback is the callback function for handling incoming mqtt steeringWheel frames
var SteeringWheelIngestCallback = func(client mqtt.Client, msg mqtt.Message) {
	utils.SugarLogger.Infof("[MQ-%s] Received steeringWheel frame", msg.Topic())
	steeringWheel := SteeringWheelFromBytes(msg.Payload())
	if steeringWheel.ID != "" {
		steeringWheel.VehicleID = strings.Split(msg.Topic(), "/")[1]
		steeringWheel = scaleSteeringWheel(steeringWheel)
		utils.SugarLogger.Infoln(steeringWheel)
		steeringWheelNotify(steeringWheel)
		go func() {
			err := CreateSteeringWheel(steeringWheel)
			if err != nil {
				utils.SugarLogger.Errorln(err)
			}
		}()
	}
}

// SteeringWheelFromBytes converts a byte array to a steeringWheel struct
// If the conversion fails, an empty steeringWheel struct is returned
func SteeringWheelFromBytes(data []byte) model.SteeringWheel {
	var steeringWheel model.SteeringWheel
	steeringWheelFields := model.NewSteeringWheelNode()
	err := steeringWheelFields.FillFromBytes(data)
	if err != nil {
		utils.SugarLogger.Errorln("Failed to parse steeringwWeel:", err)
		return steeringWheel
	}
	steeringWheel.ID = uuid.New().String()
	steeringWheel.PowerLevel = steeringWheelFields[0].Value
	steeringWheel.TorqueMap = steeringWheelFields[1].Value
	steeringWheel.Regen = steeringWheelFields[2].Value
	steeringWheel.ButtonOne = steeringWheelFields[3].Value
	steeringWheel.ButtonTwo = steeringWheelFields[4].Value
	steeringWheel.ButtonThree = steeringWheelFields[5].Value
	steeringWheel.ButtonFour = steeringWheelFields[6].Value
	steeringWheel.Millis = steeringWheelFields[8].Value
	return steeringWheel
}

// scaleSteeringWheel does not scale the steeringWheel values to be between 0 and 100
func scaleSteeringWheel(steeringWheel model.SteeringWheel) model.SteeringWheel {
	return steeringWheel
}

func CreateSteeringWheel(steeringWheel model.SteeringWheel) error {
	if result := database.DB.Create(&steeringWheel); result.Error != nil {
		return result.Error
	}
	return nil
}

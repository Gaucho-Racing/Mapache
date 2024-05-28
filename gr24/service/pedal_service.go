package service

import (
	"gr24/database"
	"gr24/model"
	"gr24/utils"
	"strings"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/google/uuid"
)

var pedalCallbacks []func(pedal model.Pedal)

// pedalNotify calls all the functions registered to pedalCallbacks
func pedalNotify(pedal model.Pedal) {
	for _, callback := range pedalCallbacks {
		callback(pedal)
	}
}

// SubscribePedal registers a function to be called when a new pedal is received
func SubscribePedal(callback func(pedal model.Pedal)) {
	pedalCallbacks = append(pedalCallbacks, callback)
}

// PedalIngestCallback is the callback function for handling incoming mqtt pedal frames
var PedalIngestCallback = func(client mqtt.Client, msg mqtt.Message) {
	utils.SugarLogger.Infof("[MQ-%s] Received pedal frame", msg.Topic())
	pedal := PedalFromBytes(msg.Payload())
	if pedal.ID != "" {
		pedal.VehicleID = strings.Split(msg.Topic(), "/")[1]
		pedal = scalePedal(pedal)
		utils.SugarLogger.Infoln(pedal)
		pedalNotify(pedal)
		go func() {
			err := CreatePedal(pedal)
			if err != nil {
				utils.SugarLogger.Errorln(err)
			}
		}()
	}
}

// PedalFromBytes converts a byte array to a pedal struct
// If the conversion fails, an empty pedal struct is returned
func PedalFromBytes(data []byte) model.Pedal {
	var pedal model.Pedal
	pedalFields := model.NewPedalNode()
	err := pedalFields.FillFromBytes(data)
	if err != nil {
		utils.SugarLogger.Errorln("Failed to parse pedal:", err)
		return pedal
	}
	pedal.ID = uuid.New().String()
	pedal.AppsOne = float64(pedalFields[0].Value)
	pedal.AppsTwo = float64(pedalFields[1].Value)
	pedal.Millis = pedalFields[3].Value
	return pedal
}

// scalePedal scales the pedal values to be between 0 and 100
func scalePedal(pedal model.Pedal) model.Pedal {
	apps1Min := 14070
	apps1Max := 28440
	apps2Min := 9965
	apps2Max := 20280
	pedal.AppsOne = (pedal.AppsOne - float64(apps1Min)) / float64(apps1Max-apps1Min) * 100
	pedal.AppsTwo = (pedal.AppsTwo - float64(apps2Min)) / float64(apps2Max-apps2Min) * 100
	return pedal
}

func CreatePedal(pedal model.Pedal) error {
	if result := database.DB.Create(&pedal); result.Error != nil {
		return result.Error
	}
	return nil
}

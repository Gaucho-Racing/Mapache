package service

import (
	"gr24/database"
	"gr24/model"
	"gr24/utils"

	mqtt "github.com/eclipse/paho.mqtt.golang"
)

var pedalCallbacks []func(pedal model.Pedal)

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
	utils.SugarLogger.Infoln("[MQ] Received pedal frame")
	pedal := PedalFromBytes(msg.Payload())
	if pedal.ID != "" {
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
	pedal.AppsOne = float64(pedalFields[0].Value)
	pedal.AppsTwo = float64(pedalFields[1].Value)
	pedal.Millis = pedalFields[2].Value
	return pedal
}

func CreatePedal(pedal model.Pedal) error {
	if result := database.DB.Create(&pedal); result.Error != nil {
		return result.Error
	}
	return nil
}

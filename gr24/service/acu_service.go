package service

import (
	"gr24/database"
	"gr24/model"
	"gr24/utils"
	"strings"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/google/uuid"
)

var acuCallbacks []func(acu model.ACU)

// acuNotify calls all the functions registered to acuCallbacks
func acuNotify(acu model.ACU) {
	for _, callback := range acuCallbacks {
		callback(acu)
	}
}

// SubscribeACU registers a function to be called when a new acu is received
func SubscribeACU(callback func(acu model.ACU)) {
	acuCallbacks = append(acuCallbacks, callback)
}

// ACUIngestCallback is the callback function for handling incoming mqtt acu frames
var ACUIngestCallback = func(client mqtt.Client, msg mqtt.Message) {
	utils.SugarLogger.Infof("[MQ-%s] Received acu frame", msg.Topic())
	acu := ACUFromBytes(msg.Payload())
	if acu.ID != "" {
		acu.VehicleID = strings.Split(msg.Topic(), "/")[1]
		acu = scaleACU(acu)
		utils.SugarLogger.Infoln(acu)
		acuNotify(acu)
		go func() {
			err := CreateACU(acu)
			if err != nil {
				utils.SugarLogger.Errorln(err)
			}
		}()
	}
}

// ACUFromBytes converts a byte array to a acu struct
// If the conversion fails, an empty acu struct is returned
func ACUFromBytes(data []byte) model.ACU {
	var acu model.ACU
	acuFields := model.NewACUNode()
	err := acuFields.FillFromBytes(data)
	if err != nil {
		utils.SugarLogger.Errorln("Failed to parse acu:", err)
		return acu
	}
	acu.ID = uuid.New().String()
	acu.Millis = acuFields[2].Value
	return acu
}

// scaleAcu scales the acu values
func scaleACU(acu model.ACU) model.ACU {
	return acu
}

func CreateACU(acu model.ACU) error {
	if result := database.DB.Create(&acu); result.Error != nil {
		return result.Error
	}
	return nil
}

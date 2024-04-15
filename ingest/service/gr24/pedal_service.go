package gr24service

import (
	"ingest/database"
	"ingest/model/gr24"
	"ingest/rabbitmq"
	"ingest/service"
	"ingest/utils"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/google/uuid"
)

var pedalCallbacks []func(pedal gr24model.Pedal)

func pedalNotify(pedal gr24model.Pedal) {
	for _, callback := range pedalCallbacks {
		callback(pedal)
	}
}

func PedalSubscribe(callback func(Pedal gr24model.Pedal)) {
	pedalCallbacks = append(pedalCallbacks, callback)
}

func InitializePedalIngest() {
	callback := func(client mqtt.Client, msg mqtt.Message) {
		utils.SugarLogger.Infoln("[MQ] Received pedal frame")
		pedal := parsePedal(msg.Payload())
		if pedal.ID != "" {
			pedalNotify(pedal)
			err := CreatePedal(pedal)
			if err != nil {
				utils.SugarLogger.Errorln(err)
			}
		}
	}
	rabbitmq.Client.Subscribe("gr24/pedal", 0, callback)
	//utils.SugarLogger.Infoln("[MQ] Subscribed to topic: gr24/pedal")
}

// parsePedal function takes in a byte array and returns a Pedal struct
func parsePedal(data []byte) gr24model.Pedal {
	var pedal gr24model.Pedal
	if len(data) != 8 {
		utils.SugarLogger.Warnln("Pedal data length is not 8 bytes! Received: ", len(data))
		return pedal
	}
	pedal.ID = uuid.NewString()
	pedal.Millis = int(time.Now().UnixMilli())
	pedal.APPSOne = float64(int(data[0])<<8 | int(data[1]))
	pedal.APPSTwo = float64(int(data[2])<<8 | int(data[3]))
	pedal.BrakePressureFront = float64(int(data[4])<<8 | int(data[5]))
	pedal.BrakePressureRear = float64(int(data[6])<<8 | int(data[7]))
	pedal = scalePedal(pedal)
	return pedal
}

func scalePedal(pedal gr24model.Pedal) gr24model.Pedal {
	pedal.APPSOne = pedal.APPSOne * service.GetScaleEnvVar("GR24", "Pedal", "APPSOne")
	pedal.APPSTwo = pedal.APPSTwo * service.GetScaleEnvVar("GR24", "Pedal", "APPSTwo")
	pedal.BrakePressureFront = pedal.BrakePressureFront * service.GetScaleEnvVar("GR24", "Pedal", "BrakePressureFront")
	pedal.BrakePressureRear = pedal.BrakePressureRear * service.GetScaleEnvVar("GR24", "Pedal", "BrakePressureRear")
	return pedal
}

func CreatePedal(pedal gr24model.Pedal) error {
	if result := database.DB.Create(&pedal); result.Error != nil {
		return result.Error
	}
	return nil
}

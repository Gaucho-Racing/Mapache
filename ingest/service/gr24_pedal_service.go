package service

import (
	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/google/uuid"
	"ingest/model"
	"ingest/utils"
	"time"
)

func GR24InitializePedalIngest() {
	callback := func(client mqtt.Client, msg mqtt.Message) {
		utils.SugarLogger.Infoln("[MQ] Received pedal frame")
		pedal := parsePedal(msg.Payload())
		if pedal.ID != "" {
			err := CreatePedal(pedal)
			if err != nil {
				utils.SugarLogger.Errorln(err)
			}
		}
	}
	RabbitClient.Subscribe("gr24/pedal", 0, callback)
}

// parsePedal function takes in a byte array and returns a Pedal struct
func parsePedal(data []byte) model.GR24Pedal {
	var pedal model.GR24Pedal
	if len(data) != 16 {
		utils.SugarLogger.Warnln("Pedal data length is not 16 bytes!")
		return pedal
	}
	pedal.ID = uuid.NewString()
	pedal.Millis = int(time.Now().UnixMilli())
	pedal.APPSOne = int(data[0])<<8 | int(data[1])
	pedal.APPSTwo = int(data[2])<<8 | int(data[3])
	pedal.BrakePressureFront = int(data[4])<<8 | int(data[5])
	pedal.BrakePressureRear = int(data[6])<<8 | int(data[7])
	return pedal
}

func scale(pedal model.GR24Pedal) model.GR24Pedal {
	return pedal
}

func CreatePedal(pedal model.GR24Pedal) error {
	if result := DB.Create(&pedal); result.Error != nil {
		return result.Error
	}
	return nil
}

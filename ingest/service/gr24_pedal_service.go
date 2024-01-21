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
	pedal.APPSOne = float64(int(data[0])<<8 | int(data[1]))
	pedal.APPSTwo = float64(int(data[2])<<8 | int(data[3]))
	pedal.BrakePressureFront = float64(int(data[4])<<8 | int(data[5]))
	pedal.BrakePressureRear = float64(int(data[6])<<8 | int(data[7]))
	pedal = scale(pedal)
	return pedal
}

func scale(pedal model.GR24Pedal) model.GR24Pedal {
	pedal.APPSOne = pedal.APPSOne * getScale("APPSOne")
	pedal.APPSTwo = pedal.APPSTwo * getScale("APPSTwo")
	pedal.BrakePressureFront = pedal.BrakePressureFront * getScale("BrakePressureFront")
	pedal.BrakePressureRear = pedal.BrakePressureRear * getScale("BrakePressureRear")
	return pedal
}

func getScale(variable string) float64 {
	scaleVar := os.Getenv("SCALE_GR24_PEDAL_" + variable)
	if scaleVar != "" {
		scaleFloat, err := strconv.ParseFloat(scaleVar, 64)
		if err != nil {
			return 1
		}
		return scaleFloat
	}
	return 1
}

func CreatePedal(pedal model.GR24Pedal) error {
	if result := DB.Create(&pedal); result.Error != nil {
		return result.Error
	}
	return nil
}

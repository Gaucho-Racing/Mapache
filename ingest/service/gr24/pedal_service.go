package gr24service

import (
	"ingest/database"
	"ingest/model/gr24"
	"ingest/rabbitmq"
	"ingest/utils"
	"os"
	"strconv"
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

func GR24InitializePedalIngest() {
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
}

// parsePedal function takes in a byte array and returns a Pedal struct
func parsePedal(data []byte) gr24model.Pedal {
	var pedal gr24model.Pedal
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
	pedal = scalePedal(pedal)
	return pedal
}

func scalePedal(pedal gr24model.Pedal) gr24model.Pedal {
	pedal.APPSOne = pedal.APPSOne * getPedalScale("APPSOne")
	pedal.APPSTwo = pedal.APPSTwo * getPedalScale("APPSTwo")
	pedal.BrakePressureFront = pedal.BrakePressureFront * getPedalScale("BrakePressureFront")
	pedal.BrakePressureRear = pedal.BrakePressureRear * getPedalScale("BrakePressureRear")
	return pedal
}

func getPedalScale(variable string) float64 {
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

func CreatePedal(pedal gr24model.Pedal) error {
	if result := database.DB.Create(&pedal); result.Error != nil {
		return result.Error
	}
	return nil
}

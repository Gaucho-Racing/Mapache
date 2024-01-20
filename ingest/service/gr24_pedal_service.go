package service

import (
	"fmt"
	"ingest/model"
	"ingest/utils"
	"os"
	"reflect"
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
	r := reflect.ValueOf(pedal)
	for i := 0; i < r.NumField(); i++ {
		field := r.Type().Field(i).Name
		if field != "ID" && field != "Millis" && field != "CreatedAt" {
			scaleEnvVar := os.Getenv(fmt.Sprintf("SCALE_GR24_PEDAL_%s", field))
			println(scaleEnvVar)
			if scaleEnvVar != "" {
				scaleFloat, err := strconv.ParseFloat(scaleEnvVar, 64)
				if err == nil {
					pedal.APPSOne *= scaleFloat
				}
			}
		}
		fmt.Printf("↳\t%s\tValue: %v\n", r.Type().Field(i).Name, r.Field(i).Interface())
	}
	return pedal
}

func CreatePedal(pedal model.GR24Pedal) error {
	if result := DB.Create(&pedal); result.Error != nil {
		return result.Error
	}
	return nil
}

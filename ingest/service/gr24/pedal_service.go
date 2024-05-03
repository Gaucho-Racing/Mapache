package gr24service

import (
	"ingest/database"
	"ingest/model"
	gr24model "ingest/model/gr24"
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
			go func() {
				err := CreatePedal(pedal)
				if err != nil {
					utils.SugarLogger.Errorln(err)
				}
			}()
		}
	}
	rabbitmq.Client.Subscribe("gr24/pedal", 0, callback)
}

// parsePedal function takes in a byte array and returns a Pedal struct
func parsePedal(data []byte) gr24model.Pedal {
	var pedal gr24model.Pedal
	//if len(data) != 8 {
	//	utils.SugarLogger.Warnln("Pedal data length is not 8 bytes! Received: ", len(data))
	//	return pedal
	//}
	pedal.ID = uuid.NewString()
	pedal.Millis = int(time.Now().UnixMilli())
	//pedal.APPSOne = float64(int(data[0])<<8 | int(data[1]))
	//pedal.APPSTwo = float64(int(data[2])<<8 | int(data[3]))
	//pedal.BrakePressureFront = float64(int(data[4])<<8 | int(data[5]))
	//pedal.BrakePressureRear = float64(int(data[6])<<8 | int(data[7]))
	//pedal = scalePedal(pedal)
	return pedal
}

func scalePedal(pedal gr24model.Pedal) gr24model.Pedal {
	// Scaling pedal.APPSOne from raw value range 50100:0 to 44256:100
	if pedal.APPSOne >= 44256 && pedal.APPSOne <= 50100 {
		pedal.APPSOne = 100.0 - ((pedal.APPSOne - 44256) / (50100 - 44256) * 100)
	} else if pedal.APPSOne < 44256 {
		pedal.APPSOne = 100.0
	} else {
		pedal.APPSOne = 0.0
	}
	// Scaling pedal.APPSTwo from raw value range 41810:0 to 38750:100
	if pedal.APPSTwo >= 38750 && pedal.APPSTwo <= 41810 {
		pedal.APPSTwo = 100.0 - ((pedal.APPSTwo - 38750) / (41810 - 38750) * 100)
	} else if pedal.APPSTwo < 38750 {
	} else {
		pedal.APPSTwo = 0.0
	}
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

func GetAllPedals() []gr24model.Pedal {
	var pedals []gr24model.Pedal
	database.DB.Find(&pedals)
	return pedals
}

func GetPedalByID(id string) gr24model.Pedal {
	var pedal gr24model.Pedal
	database.DB.Where("id = ?", id).First(&pedal)
	return pedal
}

func GetAllPedalsForTrip(trip model.Trip) []gr24model.Pedal {
	var pedals []gr24model.Pedal
	if trip.StartTime == trip.EndTime {
		println("Ongoing trip")
		database.DB.Where("created_at >= ?", trip.StartTime).Find(&pedals)
	} else {
		database.DB.Where("created_at >= ? AND created_at <= ?", trip.StartTime, trip.EndTime).Find(&pedals)
	}
	return pedals
}

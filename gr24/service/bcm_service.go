package service

import (
	"gr24/database"
	"gr24/model"
	"gr24/utils"
	"strings"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/google/uuid"
)

var bcmCallbacks []func(bcm model.BCM)

// bcmNotify calls all the functions registered to bcmCallbacks
func bcmNotify(bcm model.BCM) {
	for _, callback := range bcmCallbacks {
		callback(bcm)
	}
}

// SubscribeBCM registers a function to be called when a new bcm is received
func SubscribeBCM(callback func(bcm model.BCM)) {
	bcmCallbacks = append(bcmCallbacks, callback)
}

// BCMIngestCallback is the callback function for handling incoming mqtt bcm frames
var BCMIngestCallback = func(client mqtt.Client, msg mqtt.Message) {
	utils.SugarLogger.Infof("[MQ-%s] Received bcm frame", msg.Topic())
	bcm := BCMFromBytes(msg.Payload())
	if bcm.ID != "" {
		bcm.VehicleID = strings.Split(msg.Topic(), "/")[1]
		bcm = scaleBCM(bcm)
		utils.SugarLogger.Infoln(bcm)
		bcmNotify(bcm)
		go func() {
			err := CreateBCM(bcm)
			if err != nil {
				utils.SugarLogger.Errorln(err)
			}
		}()
	}
}

// BCMFromBytes converts a byte array to a bcm struct
// If the conversion fails, an empty bcm struct is returned
func BCMFromBytes(data []byte) model.BCM {
	var bcm model.BCM
	bcmFields := model.NewBCMNode()
	err := bcmFields.FillFromBytes(data)
	if err != nil {
		utils.SugarLogger.Errorln("Failed to parse bcm:", err)
		return bcm
	}
	bcm.ID = uuid.New().String()
	bcm.CreatedAt = time.Now()
	bcm.AccelX = float64(bcmFields[0].Value)
	bcm.AccelY = float64(bcmFields[1].Value)
	bcm.AccelZ = float64(bcmFields[2].Value)
	bcm.GyroX = float64(bcmFields[4].Value)
	bcm.GyroY = float64(bcmFields[5].Value)
	bcm.GyroZ = float64(bcmFields[6].Value)
	bcm.Millis = bcmFields[8].Value
	return bcm
}

// scaleBCM does not scale the bcm values to be between 0 and 100
func scaleBCM(bcm model.BCM) model.BCM {
	return bcm
}

func CreateBCM(bcm model.BCM) error {
	if result := database.DB.Create(&bcm); result.Error != nil {
		return result.Error
	}
	return nil
}

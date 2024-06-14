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

var vdmCallbacks []func(vdm model.VDM)

// vdmNotify calls all the functions registered to vdmCallbacks
func vdmNotify(vdm model.VDM) {
	for _, callback := range vdmCallbacks {
		callback(vdm)
	}
}

// SubscribeVDM registers a function to be called when a new vdm is received
func SubscribeVDM(callback func(vdm model.VDM)) {
	vdmCallbacks = append(vdmCallbacks, callback)
}

// VDMIngestCallback is the callback function for handling incoming mqtt vdm frames
var VDMIngestCallback = func(client mqtt.Client, msg mqtt.Message) {
	utils.SugarLogger.Infof("[MQ-%s] Received vdm frame", msg.Topic())
	vdm := VDMFromBytes(msg.Payload())
	if vdm.ID != "" {
		vdm.VehicleID = strings.Split(msg.Topic(), "/")[1]
		vdm = scaleVDM(vdm)
		utils.SugarLogger.Infoln(vdm)
		vdmNotify(vdm)
		go func() {
			err := CreateVDM(vdm)
			if err != nil {
				utils.SugarLogger.Errorln(err)
			}
		}()
	}
}

// VDMFromBytes converts a byte array to a vdm struct
// If the conversion fails, an empty vdm struct is returned
func VDMFromBytes(data []byte) model.VDM {
	var vdm model.VDM
	vdmFields := model.NewVDMNode()
	err := vdmFields.FillFromBytes(data)
	if err != nil {
		utils.SugarLogger.Errorln("Failed to parse vdm:", err)
		return vdm
	}
	vdm.ID = uuid.New().String()
	vdm.CreatedAt = time.Now()
	vdm.Mode = vdmFields[0].Value
	vdm.State = vdmFields[1].Value
	vdm.RevLimit = float64(vdmFields[2].Value)
	vdm.TcmStatus = vdmFields[3].Value
	vdm.CanStatus = vdmFields[4].Value
	vdm.SystemStatus = vdmFields[5].Value
	vdm.MaxPower = float64(vdmFields[6].Value)
	vdm.RawState = vdmFields[7].Value
	vdm.SystemHealth1 = vdmFields[8].Value
	vdm.IsAmsFault = vdmFields[8].CheckBit(2)
	vdm.IsImdFault = vdmFields[8].CheckBit(3)
	vdm.IsBspdFault = vdmFields[8].CheckBit(4)
	vdm.IsSdcOpened = vdmFields[8].CheckBit(5)
	vdm.CA = vdmFields[9].Value
	vdm.MotorTempWarning = vdmFields[9].CheckBit(0)
	vdm.MotorTempLimit = vdmFields[9].CheckBit(1)
	vdm.MotorTempCritical = vdmFields[9].CheckBit(2)
	vdm.BatteryTempWarning = vdmFields[9].CheckBit(3)
	vdm.BatteryTempLimit = vdmFields[9].CheckBit(4)
	vdm.BatteryTempCritical = vdmFields[9].CheckBit(5)
	vdm.RevLimitExceeded = vdmFields[9].CheckBit(6)
	vdm.SystemHealth2 = vdmFields[10].Value
	vdm.InverterTempWarning = vdmFields[10].CheckBit(3)
	vdm.InverterTempLimit = vdmFields[10].CheckBit(4)
	vdm.InverterTempCritical = vdmFields[10].CheckBit(5)
	vdm.Speed = float64(vdmFields[12].Value)
	vdm.BrakeF = float64(vdmFields[13].Value)
	vdm.BrakeR = float64(vdmFields[14].Value)
	vdm.ErrorCode = vdmFields[16].Value
	vdm.Duraton = vdmFields[17].Value
	vdm.TorqueMap = vdmFields[18].Value
	vdm.MaxCurrent = vdmFields[19].Value
	vdm.RegenLevel = vdmFields[20].Value
	vdm.Millis = vdmFields[23].Value
	return vdm
}

// scaleVDM scales the vdm values
func scaleVDM(vdm model.VDM) model.VDM {
	return vdm
}

func CreateVDM(vdm model.VDM) error {
	if result := database.DB.Create(&vdm); result.Error != nil {
		return result.Error
	}
	return nil
}

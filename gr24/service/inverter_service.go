package service

import (
	"gr24/database"
	"gr24/model"
	"gr24/utils"
	"strings"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/google/uuid"
)

var inverterCallbacks []func(inverter model.Inverter)

// inverterNotify calls all the functions registered to inverterCallbacks
func inverterNotify(inverter model.Inverter) {
	for _, callback := range inverterCallbacks {
		callback(inverter)
	}
}

// SubscribeInverter registers a function to be called when a new inverter is received
func SubscribeInverter(callback func(inverter model.Inverter)) {
	inverterCallbacks = append(inverterCallbacks, callback)
}

// InverterIngestCallback is the callback function for handling incoming mqtt inverter frames
var InverterIngestCallback = func(client mqtt.Client, msg mqtt.Message) {
	utils.SugarLogger.Infof("[MQ-%s] Received inverter frame", msg.Topic())
	inverter := InverterFromBytes(msg.Payload())
	if inverter.ID != "" {
		inverter.VehicleID = strings.Split(msg.Topic(), "/")[1]
		inverter = scaleInverter(inverter)
		utils.SugarLogger.Infoln(inverter)
		inverterNotify(inverter)
		go func() {
			err := CreateInverter(inverter)
			if err != nil {
				utils.SugarLogger.Errorln(err)
			}
		}()
	}
}

// InverterFromBytes converts a byte array to a inverter struct
// If the conversion fails, an empty inverter struct is returned
func InverterFromBytes(data []byte) model.Inverter {
	var inverter model.Inverter
	inverterFields := model.NewInverterNode()
	err := inverterFields.FillFromBytes(data)
	if err != nil {
		utils.SugarLogger.Errorln("Failed to parse inverter:", err)
		return inverter
	}
	inverter.ID = uuid.New().String()
	inverter.ERPM = inverterFields[0].Value
	inverter.DutyCycle = inverterFields[1].Value
	inverter.InputVoltage = inverterFields[2].Value
	inverter.CurrentAC = inverterFields[3].Value
	inverter.CurrentDC = inverterFields[4].Value
	inverter.ControllerTemp = inverterFields[6].Value
	inverter.MotorTemp = inverterFields[7].Value

	inverter.Faults = inverterFields[8].Value
	if inverter.Faults == 1 {
		inverter.OvervoltageError = true
	}
	if inverter.Faults == 2 {
		inverter.UndervoltageError = true
	}
	if inverter.Faults == 3 {
		inverter.DRVError = true
	}
	if inverter.Faults == 4 {
		inverter.OvercurrentError = true
	}
	if inverter.Faults == 5 {
		inverter.ControllerOvertempError = true
	}
	if inverter.Faults == 6 {
		inverter.MotorOvertempError = true
	}
	if inverter.Faults == 7 {
		inverter.SensorWireError = true
	}
	if inverter.Faults == 8 {
		inverter.SensorGeneralError = true
	}
	if inverter.Faults == 9 {
		inverter.CANCommandError = true
	}
	if inverter.Faults == 10 {
		inverter.AnalogInputError = true
	}

	inverter.FOCID = inverterFields[10].Value
	inverter.FOCIQ = inverterFields[11].Value
	inverter.Throttle = inverterFields[12].Value
	inverter.Brake = inverterFields[13].Value
	inverter.DigitalIO = inverterFields[14].Value
	inverter.DriveEnable = inverterFields[15].Value
	inverter.FlagsOne = inverterFields[16].Value
	inverter.FlagsTwo = inverterFields[17].Value
	inverter.CANVersion = inverterFields[19].Value
	inverter.Millis = inverterFields[20].Value
	return inverter
}

// scaleInverter does not scale the inverter values to be between 0 and 100
func scaleInverter(inverter model.Inverter) model.Inverter {
	return inverter
}

func CreateInverter(inverter model.Inverter) error {
	if result := database.DB.Create(&inverter); result.Error != nil {
		return result.Error
	}
	return nil
}

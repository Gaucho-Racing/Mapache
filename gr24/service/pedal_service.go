package service

import (
	"gr24/model"
	"gr24/utils"
)

func PedalFromBytes(data []byte) model.Pedal {
	var pedal model.Pedal
	pedalFields := model.NewPedalNode()
	err := pedalFields.FillFromBytes(data)
	if err != nil {
		utils.SugarLogger.Errorln("Failed to parse pedal:", err)
		return pedal
	}
	pedal.AppsOne = float64(pedalFields[0].Value)
	pedal.AppsTwo = float64(pedalFields[1].Value)
	pedal.Millis = pedalFields[2].Value
	return pedal
}

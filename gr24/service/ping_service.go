package service

import (
	"gr24/database"
	"gr24/model"
	"gr24/utils"
	"strings"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
)

// PingIngestCallback is the callback function for handling incoming mqtt tcm ping frames
var PingIngestCallback = func(client mqtt.Client, msg mqtt.Message) {
	utils.SugarLogger.Infof("[MQ-%s] Received ping frame", msg.Topic())
	vehicleID := strings.Split(msg.Topic(), "/")[1]
	currentTime := time.Now().UnixMilli()
	lastPing, _ := GetLastPing(vehicleID)
	if lastPing.ID != "" {
		lastPing.Pong = currentTime
		lastPing.Delta = currentTime - lastPing.Ping
		_ = DeletePingByID(lastPing.ID)
		err := CreatePing(lastPing)
		if err != nil {
			utils.SugarLogger.Errorln(err)
		}
		utils.SugarLogger.Infof("Ping: %d ms", lastPing.Delta)
	}
}

func CreatePing(ping model.Ping) error {
	result := database.DB.Create(&ping)
	if result.Error != nil {
		if strings.Contains(result.Error.Error(), "Duplicate entry") {
			_ = database.DB.Where("id = ?", ping.ID).Updates(&ping)
		} else {
			return result.Error
		}
	}
	return nil
}

func GetLastPing(vehicleID string) (model.Ping, error) {
	var ping model.Ping
	if result := database.DB.Where("vehicle_id = ?", vehicleID).Order("created_at desc").First(&ping); result.Error != nil {
		return ping, result.Error
	}
	return ping, nil
}

func GetLastSuccessfulPing(vehicleID string) (model.Ping, error) {
	var ping model.Ping
	if result := database.DB.Where("vehicle_id = ? AND pong > 0", vehicleID).Order("created_at desc").First(&ping); result.Error != nil {
		return ping, result.Error
	}
	return ping, nil
}

func DeletePingByID(id string) error {
	if result := database.DB.Where("id = ?", id).Delete(&model.Ping{}); result.Error != nil {
		return result.Error
	}
	return nil
}

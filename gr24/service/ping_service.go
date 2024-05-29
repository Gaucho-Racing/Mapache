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

// PingIngestCallback is the callback function for handling incoming mqtt tcm ping frames
var PingIngestCallback = func(client mqtt.Client, msg mqtt.Message) {
	utils.SugarLogger.Infof("[MQ-%s] Received ping frame", msg.Topic())
	vehicleID := strings.Split(msg.Topic(), "/")[1]
	ping := PingFromBytes(msg.Payload())
	if ping.ID == "" {
		currentTime := time.Now().UnixMilli()
		delta := currentTime - ping.Ping
		lastPing, _ := GetLastPing(vehicleID)
		if lastPing.ID != "" {
			lastPing.Pong = currentTime
			lastPing.Delta = delta
			err := CreatePing(lastPing)
			if err != nil {
				utils.SugarLogger.Errorln(err)
			}
		}
		utils.SugarLogger.Infof("Ping: %d ms", ping)
	}
}

// PingFromBytes converts a byte array to a ping struct
// If the conversion fails, an empty ping struct is returned
func PingFromBytes(data []byte) model.Ping {
	var ping model.Ping
	pingFields := model.NewPingNode()
	err := pingFields.FillFromBytes(data)
	if err != nil {
		utils.SugarLogger.Errorln("Failed to parse ping:", err)
		return ping
	}
	ping.ID = uuid.New().String()
	ping.Ping = int64(pingFields[0].Value)
	return ping
}

func CreatePing(ping model.Ping) error {
	result := database.DB.Create(&ping)
	if result.Error != nil {
		if strings.Contains(result.Error.Error(), "Duplicate entry") {
			result = database.DB.Where("id = ?", ping.ID).Updates(&ping)
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

package service

import (
	"bahrain/config"
	"bahrain/utils"
	"github.com/bk1031/rincon-go"
	"time"
)

var rinconRetries = 0

var isRunningInDocker = false

func RegisterRincon() {
	rinconEndpoint := "http://rincon:10311"
	client, err := rincon.NewClient(rincon.Config{
		BaseURL:           rinconEndpoint,
		HeartbeatMode:     rincon.ServerHeartbeat,
		HeartbeatInterval: 60,
		AuthUser:          config.RinconUser,
		AuthPassword:      config.RinconPassword,
	})
	if err != nil {
		utils.SugarLogger.Errorf("Failed to create Rincon client with %s: %v", rinconEndpoint, err)
		rinconEndpoint = "http://localhost:10311"
		client, err = rincon.NewClient(rincon.Config{
			BaseURL:           rinconEndpoint,
			HeartbeatMode:     rincon.ServerHeartbeat,
			HeartbeatInterval: 60,
			AuthUser:          config.RinconUser,
			AuthPassword:      config.RinconPassword,
		})
		if err != nil {
			if rinconRetries < 5 {
				utils.SugarLogger.Errorf("Failed to create Rincon client with %s: %v, retrying in 5s...", rinconEndpoint, err)
				rinconRetries++
				time.Sleep(time.Second * 5)
				RegisterRincon()
			} else {
				utils.SugarLogger.Fatalln("Failed to create Rincon client after 5 attempts")
				return
			}
		} else {
			utils.SugarLogger.Infof("Created Rincon client with endpoint %s", rinconEndpoint)
			isRunningInDocker = false
		}
	} else {
		utils.SugarLogger.Infof("Created Rincon client with endpoint %s", rinconEndpoint)
		isRunningInDocker = true
	}
	config.RinconClient = client
	if isRunningInDocker {
		config.Service.Endpoint = "http://rincon:" + config.Port
		config.Service.HealthCheck = "http://rincon:" + config.Port + "/ping"
	} else {
		config.Service.Endpoint = "http://host.docker.internal:" + config.Port
		config.Service.HealthCheck = "http://host.docker.internal:" + config.Port + "/ping"
	}
	id, err := config.RinconClient.Register(config.Service, config.Routes)
	if err != nil {
		utils.SugarLogger.Errorf("Failed to register service with Rincon: %v", err)
		return
	}
	config.Service = *config.RinconClient.Service()
	utils.SugarLogger.Infof("Registered service with ID: %d", id)
}

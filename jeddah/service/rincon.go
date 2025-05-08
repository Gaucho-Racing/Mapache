package service

import (
	"jeddah/config"
	"jeddah/utils"
	"time"

	"github.com/bk1031/rincon-go/v2"
)

var rinconRetries = 0

func RegisterRincon() {
	if config.RinconEndpoint == "" || config.RinconUser == "" || config.RinconPassword == "" {
		utils.SugarLogger.Warnln("Rincon endpoint, user, or password not set, skipping registration")
		return
	}
	client, err := rincon.NewClient(rincon.Config{
		BaseURL:           config.RinconEndpoint,
		HeartbeatMode:     rincon.ServerHeartbeat,
		HeartbeatInterval: 60,
		AuthUser:          config.RinconUser,
		AuthPassword:      config.RinconPassword,
	})
	if err != nil {
		if rinconRetries < 5 {
			utils.SugarLogger.Errorf("Failed to create Rincon client with %s: %v, retrying in 5s...", config.RinconEndpoint, err)
			rinconRetries++
			time.Sleep(time.Second * 5)
			RegisterRincon()
		} else {
			utils.SugarLogger.Fatalln("Failed to create Rincon client after 5 attempts")
			return
		}
	}
	utils.SugarLogger.Infof("Created Rincon client with endpoint %s", config.RinconEndpoint)
	config.RinconClient = client

	config.Service.Endpoint = config.ServiceEndpoint
	config.Service.HealthCheck = config.ServiceHealthCheck
	id, err := client.Register(config.Service, config.Routes)
	if err != nil {
		utils.SugarLogger.Fatalf("Failed to register service with Rincon: %v", err)
		return
	}
	config.Service = *client.Service()
	utils.SugarLogger.Infof("Registered service with ID: %d", id)
}

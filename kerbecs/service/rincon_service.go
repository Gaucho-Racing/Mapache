package service

import (
	"github.com/bk1031/rincon-go"
	"kerbecs/config"
	"kerbecs/utils"
)

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
		rinconEndpoint = "http://host.docker.internal:10311"
		client, err = rincon.NewClient(rincon.Config{
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
				utils.SugarLogger.Errorf("Failed to create Rincon client with %s: %v", rinconEndpoint, err)
				return
			} else {
				utils.SugarLogger.Infof("Created Rincon client with endpoint %s", rinconEndpoint)
				utils.SugarLogger.Infof("Service is running on Host, Rincon running on Host!")
			}
		} else {
			utils.SugarLogger.Infof("Created Rincon client with endpoint %s", rinconEndpoint)
			utils.SugarLogger.Infof("Service is running on Docker, Rincon running on Host!")
		}
	} else {
		utils.SugarLogger.Infof("Created Rincon client with endpoint %s", rinconEndpoint)
		utils.SugarLogger.Infof("Service is running on Docker, Rincon running on Docker!")
	}
	config.RinconClient = client
	config.Service = rincon.Service{
		Name:        "Kerbecs",
		Version:     config.Version,
		Endpoint:    "http://kerbecs:" + config.AdminPort,
		HealthCheck: "http://kerbecs:" + config.AdminPort + "/admin-gw/ping",
	}
	id, err := config.RinconClient.Register(config.Service, []string{"/admin-gw/**"})
	if err != nil {
		utils.SugarLogger.Errorf("Failed to register service with Rincon: %v", err)
		return
	}
	config.Service = *config.RinconClient.Service()
	utils.SugarLogger.Infof("Registered service with ID: %d", id)
}

package service

import (
	"github.com/go-co-op/gocron/v2"
	"github.com/go-resty/resty/v2"
	"rincon/config"
	"rincon/utils"
	"strconv"
	"time"
)

func InitializeHeartbeat() {
	s, _ := gocron.NewScheduler()
	interval, err := strconv.Atoi(config.HeartbeatInterval)
	if err != nil {
		utils.SugarLogger.Debugln("HEARTBEAT_INTERVAL is invalid, defaulting to 10")
		interval = 10
	}
	if config.HeartbeatType == "client" {
		j, _ := s.NewJob(
			gocron.DurationJob(time.Duration(interval)*time.Second),
			gocron.NewTask(ClientHeartbeat, interval),
		)
		utils.SugarLogger.Infof("Job ID: %d", j.ID)
		s.Start()
	} else {
		j, _ := s.NewJob(
			gocron.DurationJob(time.Duration(interval)*time.Second),
			gocron.NewTask(ServerHeartbeat, interval),
		)
		utils.SugarLogger.Infof("Job ID: %d", j.ID)
		s.Start()
	}
}

func ServerHeartbeat(interval int) {
	client := resty.New()
	for _, s := range GetAllServices() {
		resp, err := client.R().Get(s.HealthCheck)
		if err != nil {
			utils.SugarLogger.Errorf("Error pinging %s (%d): %v", s.Name, s.ID, err)
			RemoveService(s.ID)
		} else {
			if resp.StatusCode() >= 200 && resp.StatusCode() < 300 {
				utils.SugarLogger.Infof("Pinged %s (%d) in %dms", s.Name, s.ID, resp.Time().Milliseconds())
			} else {
				utils.SugarLogger.Errorf("Error pinging %s (%d): %v", s.Name, s.ID, resp)
				RemoveService(s.ID)
			}
		}
	}
}

func ClientHeartbeat(interval int) {
	for _, s := range GetAllServices() {
		delta := time.Now().Sub(s.UpdatedAt).Milliseconds()
		utils.SugarLogger.Infof("Last %s (%d) ping was %dms ago", s.Name, s.ID, delta)
		if delta > int64((interval+1)*1000) && s.Name != "rincon" {
			utils.SugarLogger.Errorf("Service %s (%d) registration expired!", s.Name, s.ID)
			RemoveService(s.ID)
		}
	}
}

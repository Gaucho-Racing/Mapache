package gr24service

import (
	"github.com/robfig/cron/v3"
	"strconv"
)

func RegisterIngestCronJob() {
	SubscribeRabbitIngest()
	c := cron.New(cron.WithSeconds())
	// purpose of this cron job is literally to handle mqtt disconnects
	// most definitely a more efficient way to do this (like in the actaul
	// mqtt recconect handler) but it works lmfao
	entryID, err := c.AddFunc("*/5 * * * * *", func() {
		SubscribeRabbitIngest()
	})
	if err != nil {
		println("Failed to register CRON Job: " + err.Error())
		return
	}
	c.Start()
	println("Registered CRON Job: " + strconv.Itoa(int(entryID)))
}

func SubscribeRabbitIngest() {
	InitializeGPSIngest()
	InitializePedalIngest()
	InitializeBCMIngest()
}

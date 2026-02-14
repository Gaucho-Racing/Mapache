package main

import (
	"ac/api"
	"ac/config"
	"ac/database"
	"ac/mqtt"
	"ac/service"
	"ac/utils"
)

func main() {
	config.PrintStartupBanner()
	utils.InitializeLogger()
	utils.VerifyConfig()
	defer utils.Logger.Sync()

	service.RegisterRincon()
	database.InitializeDB()
	service.InitSignalBatch()
	service.InitPingBatch()
	defer service.StopSignalBatch()
	defer service.StopPingBatch()
	mqtt.InitializeMQTT()
	service.SubscribeTopics()

	router := api.SetupRouter()
	api.InitializeRoutes(router)
	err := router.Run(":" + config.Port)
	if err != nil {
		utils.SugarLogger.Fatalln(err)
	}
}

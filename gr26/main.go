package main

import (
	"gr26/api"
	"gr26/config"
	"gr26/database"
	"gr26/mqtt"
	"gr26/service"
	"gr26/utils"
)

func main() {
	config.PrintStartupBanner()
	utils.InitializeLogger()
	utils.VerifyConfig()
	defer utils.Logger.Sync()

	service.RegisterRincon()
	database.InitializeDB()
	mqtt.InitializeMQTT()
	service.SubscribeTopics()

	router := api.SetupRouter()
	api.InitializeRoutes(router)
	err := router.Run(":" + config.Port)
	if err != nil {
		utils.SugarLogger.Fatalln(err)
	}
}

package main

import (
	"gr25/api"
	"gr25/config"
	"gr25/database"
	"gr25/mqtt"
	"gr25/service"
	"gr25/utils"
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

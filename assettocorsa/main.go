package main

import (
	"as/api"
	"as/config"
	"as/database"
	"as/mqtt"
	"as/service"
	"as/utils"
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

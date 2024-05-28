package main

import (
	"gr24/config"
	"gr24/controller"
	"gr24/database"
	"gr24/rabbitmq"
	"gr24/service"
	"gr24/utils"
)

func main() {
	config.PrintStartupBanner()
	utils.InitializeLogger()
	defer utils.Logger.Sync()

	utils.VerifyConfig()
	database.InitializeDB()
	service.RegisterRincon()
	rabbitmq.InitializeRabbit()

	router := controller.SetupRouter()
	controller.InitializeRoutes(router)
	err := router.Run(":" + config.Port)
	if err != nil {
		utils.SugarLogger.Fatalln(err)
	}
}

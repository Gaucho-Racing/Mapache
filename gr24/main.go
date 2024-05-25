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
	println(config.Service.Name)
	println(config.RinconUser)
	println(config.RinconPassword)

	config.PrintStartupBanner()
	utils.InitializeLogger()
	defer utils.Logger.Sync()

	utils.VerifyConfig()
	database.InitializeDB()
	service.RegisterRincon()
	rabbitmq.InitializeRabbit()
	p := service.PedalFromBytes([]byte{04, 102, 253, 78, 226, 63, 220, 255})
	utils.SugarLogger.Info(p)

	router := controller.SetupRouter()
	controller.InitializeRoutes(router)
	err := router.Run(":" + config.Port)
	if err != nil {
		utils.SugarLogger.Fatalln(err)
	}
}

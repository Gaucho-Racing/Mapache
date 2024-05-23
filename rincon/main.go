package main

import (
	"rincon/api"
	"rincon/config"
	"rincon/database"
	"rincon/service"
	"rincon/utils"
)

func main() {
	config.PrintStartupBanner()
	utils.InitializeLogger()
	defer utils.Logger.Sync()

	utils.VerifyConfig()
	database.InitializeLocal()
	database.InitializeDB()
	service.RegisterSelf()
	service.InitializeHeartbeat()

	router := api.SetupRouter()
	api.InitializeRoutes(router)
	err := router.Run(":" + config.Port)
	if err != nil {
		utils.SugarLogger.Fatalln(err)
	}
}

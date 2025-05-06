package main

import (
	"auth/api"
	"auth/config"
	"auth/database"
	"auth/service"
	"auth/utils"
)

func main() {
	config.PrintStartupBanner()
	utils.InitializeLogger()
	utils.VerifyConfig()
	defer utils.Logger.Sync()

	service.RegisterRincon()
	database.InitializeDB()
	service.InitializeKeys()
	service.PingSentinel()

	router := api.SetupRouter()
	api.InitializeRoutes(router)
	err := router.Run(":" + config.Port)
	if err != nil {
		utils.SugarLogger.Fatalln(err)
	}
}

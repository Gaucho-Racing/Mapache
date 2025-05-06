package main

import (
	"trip/api"
	"trip/config"
	"trip/database"
	"trip/service"
	"trip/utils"
)

func main() {
	config.PrintStartupBanner()
	utils.InitializeLogger()
	defer utils.Logger.Sync()

	utils.VerifyConfig()
	database.InitializeDB()
	service.RegisterRincon()

	router := api.SetupRouter()
	api.InitializeRoutes(router)
	err := router.Run(":" + config.Port)
	if err != nil {
		utils.SugarLogger.Fatalln(err)
	}
}

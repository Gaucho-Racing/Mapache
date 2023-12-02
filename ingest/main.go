package main

import (
	"github.com/gin-gonic/gin"
	"ingest/config"
	"ingest/controller"
	"ingest/service"
	"ingest/utils"
)

var router *gin.Engine

func setupRouter() *gin.Engine {
	if config.Env == "PROD" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.Default()
	r.Use(controller.RequestLogger())
	return r
}

func main() {
	utils.InitializeLogger()
	defer utils.Logger.Sync()
	
	router = setupRouter()
	controller.InitializeRoutes(router)
	service.InitializeDB()

	service.ConnectRabbit()
	defer service.RabbitConn.Close()

	service.TestSend()

	err := router.Run(":" + config.Port)
	if err != nil {
		utils.SugarLogger.Fatalln(err)
	}

	utils.SugarLogger.Info("Ingest Service v" + config.Version)
}

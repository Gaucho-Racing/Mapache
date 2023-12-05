package main

import (
	"github.com/fatih/color"
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
	PrintStartupBanner()
	utils.InitializeLogger()
	defer utils.Logger.Sync()

	router = setupRouter()
	controller.InitializeRoutes(router)
	service.InitializeDB()

	service.InitializeRabbit()
	go service.TestContinuousMetaSend()

	err := router.Run(":" + config.Port)
	if err != nil {
		utils.SugarLogger.Fatalln(err)
	}
}

func PrintStartupBanner() {
	banner := color.New(color.Bold, color.FgHiMagenta).PrintlnFunc()
	banner(config.Banner)
	version := color.New(color.Bold, color.FgMagenta).PrintlnFunc()
	version("Running v" + config.Version + " [ENV: " + config.Env + "]")
	println()
}

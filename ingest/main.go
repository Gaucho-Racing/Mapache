package main

import (
	"ingest/config"
	"ingest/controller"
	"ingest/service"
	"ingest/utils"
	"time"

	"github.com/fatih/color"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

var router *gin.Engine

func setupRouter() *gin.Engine {
	if config.Env == "PROD" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.Default()
	r.Use(cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Length", "Content-Type", "Authorization"},
		MaxAge:           12 * time.Hour,
		AllowCredentials: true,
	}))
	r.Use(controller.RequestLogger())
	r.Use(controller.AuthChecker())
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

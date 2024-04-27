package main

import (
	"ingest/config"
	"ingest/controller"
	gr24controller "ingest/controller/gr24"
	"ingest/database"
	"ingest/rabbitmq"
	gr24service "ingest/service/gr24"
	"ingest/utils"
	"time"

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
	r.Use(gr24controller.AuthMiddleware())
	return r
}

func main() {
	config.PrintStartupBanner()
	utils.InitializeLogger()
	defer utils.Logger.Sync()

	router = setupRouter()
	controller.InitializeRoutes(router)
	database.InitializeDB()
	rabbitmq.InitializeRabbit()
	gr24service.RegisterIngestCronJob()

	err := router.Run(":" + config.Port)
	if err != nil {
		utils.SugarLogger.Fatalln(err)
	}
}

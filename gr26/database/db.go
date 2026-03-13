package database

import (
	"fmt"
	"time"

	"github.com/gaucho-racing/mapache/gr26/config"
	"github.com/gaucho-racing/mapache/gr26/pkg/logger"
	"github.com/gaucho-racing/mapache/mapache-go/v3"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

var dbRetries = 0

func Init() {
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=UTC", config.DatabaseHost, config.DatabaseUser, config.DatabasePassword, config.DatabaseName, config.DatabasePort)
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		if dbRetries < 5 {
			dbRetries++
			logger.SugarLogger.Errorln("failed to connect database, retrying in 5s... ")
			time.Sleep(time.Second * 5)
			Init()
		} else {
			logger.SugarLogger.Fatalf("failed to connect database after 5 attempts")
		}
	} else {
		logger.SugarLogger.Infoln("Connected to database")
		db.AutoMigrate(&mapache.Signal{}, &mapache.Ping{})
		logger.SugarLogger.Infoln("AutoMigration complete")
		DB = db
	}
}

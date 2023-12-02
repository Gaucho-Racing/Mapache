package service

import (
	"fmt"
	"github.com/google/uuid"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"ingest/config"
	"ingest/model"
	"ingest/utils"
	"time"
)

var DB *gorm.DB

var dbRetries = 0

func InitializeDB() {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local", config.DatabaseUser, config.DatabasePassword, config.DatabaseHost, config.DatabasePort, config.DatabaseName)
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		if dbRetries < 15 {
			dbRetries++
			utils.SugarLogger.Errorln("failed to connect database, retrying in 5s... ")
			time.Sleep(time.Second * 5)
			InitializeDB()
		} else {
			utils.SugarLogger.Fatalln("failed to connect database after 15 attempts, terminating program...")
		}
	} else {
		utils.SugarLogger.Infoln("Connected to postgres database")
		db.AutoMigrate(model.Meta{})
		utils.SugarLogger.Infoln("AutoMigration complete")
		DB = db
		go TestDB()
	}
}

func TestDB() {
	DB.Create(model.Meta{
		ID:        uuid.New(),
		Service:   "Ingest",
		Version:   config.Version,
		Level:     "INFO",
		Message:   "Mapache Ingest v" + config.Version + " is online!",
		CreatedAt: time.Now(),
	})
}

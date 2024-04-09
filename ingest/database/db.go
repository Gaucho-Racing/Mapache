package database

import (
	"fmt"
	"github.com/google/uuid"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"ingest/config"
	"ingest/model"
	"ingest/utils"
	"strconv"
	"time"
)

var DB *gorm.DB

var dbKeepalive = 0
var dbRetries = 0

func InitializeDB() {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local", config.DatabaseUser, config.DatabasePassword, config.DatabaseHost, config.DatabasePort, config.DatabaseName)
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		if dbRetries < 10 {
			dbRetries++
			utils.SugarLogger.Errorln("failed to connect database, retrying in 5s... ")
			time.Sleep(time.Second * 5)
			InitializeDB()
		} else {
			utils.SugarLogger.Fatalln("failed to connect database after 15 attempts, terminating program...")
		}
	} else {
		utils.SugarLogger.Infoln("Connected to singlestore database")
		err := db.AutoMigrate(model.Meta{}, model.User{}, model.UserRole{}, model.Vehicle{}, model.GR24VDM{}, model.GR24Wheel{}, model.GR24Pedal{}, model.GR24Gps{})
		if err != nil {
			utils.SugarLogger.Fatalln("AutoMigration failed", err)
		}
		utils.SugarLogger.Infoln("AutoMigration complete")
		DB = db
	}
}

func PingDB() error {
	dbKeepalive++
	err := DB.Create(model.Meta{
		ID:        uuid.New(),
		Service:   "Ingest",
		Version:   config.Version,
		Level:     "INFO",
		Message:   "Mapache Ingest v" + config.Version + " keepalive message " + strconv.Itoa(dbKeepalive),
		CreatedAt: time.Now(),
	})
	if err.Error != nil {
		return err.Error
	}
	return nil
}

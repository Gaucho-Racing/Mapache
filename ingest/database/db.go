package database

import (
	"fmt"
	"github.com/google/uuid"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"ingest/config"
	"ingest/model"
	gr24model "ingest/model/gr24"
	"ingest/utils"
	"strconv"
	"time"
)

var DB *gorm.DB

var dbKeepalive = 0
var dbRetries = 0

func InitializeDB() {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Utc", config.DatabaseUser, config.DatabasePassword, config.DatabaseHost, config.DatabasePort, config.DatabaseName)
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		if dbRetries < 10 {
			dbRetries++
			utils.SugarLogger.Errorln("Failed to connect database, retrying in 5s... ")
			time.Sleep(time.Second * 5)
			InitializeDB()
		} else {
			utils.SugarLogger.Fatalln("Failed to connect database after 10 attempts, terminating program...")
		}
	} else {
		utils.SugarLogger.Infoln("Connected to database")
		err := db.AutoMigrate(model.Meta{}, model.User{}, model.UserRole{}, model.Vehicle{}, model.Trip{}, gr24model.Pedal{}, gr24model.GPS{}, gr24model.BCM{}, gr24model.Wheel{})
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

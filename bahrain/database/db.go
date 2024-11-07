package database

import (
	"bahrain/config"
	"bahrain/model"
	"bahrain/utils"
	"fmt"
	"strconv"
	"time"

	"github.com/gaucho-racing/mapache-go"
	"github.com/google/uuid"
	singlestore "github.com/singlestore-labs/gorm-singlestore"
	"gorm.io/gorm"
)

var DB *gorm.DB

var dbKeepalive = 0
var dbRetries = 0

func InitializeDB() {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=UTC", config.DatabaseUser, config.DatabasePassword, config.DatabaseHost, config.DatabasePort, config.DatabaseName)
	db, err := gorm.Open(singlestore.Open(dsn), &gorm.Config{})
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
		err := db.AutoMigrate(&model.Meta{}, &mapache.User{}, &mapache.UserRole{})
		if err != nil {
			utils.SugarLogger.Fatalln("AutoMigration failed", err)
		}
		utils.SugarLogger.Infoln("AutoMigration complete")
		DB = db
		_ = PingDB()
	}
}

func PingDB() error {
	dbKeepalive++
	err := DB.Create(model.Meta{
		ID:        uuid.New(),
		Service:   config.Service.FormattedName(),
		Version:   config.Service.Version,
		Level:     "INFO",
		Message:   "Mapache " + config.Service.FormattedNameWithVersion() + " keepalive message " + strconv.Itoa(dbKeepalive),
		CreatedAt: time.Now(),
	})
	if err.Error != nil {
		return err.Error
	}
	return nil
}

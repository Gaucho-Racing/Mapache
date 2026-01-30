package database

import (
	"fmt"
	"gr26/config"
	"gr26/utils"

	"time"

	"github.com/gaucho-racing/mapache-go"
	"gorm.io/driver/clickhouse"
	"gorm.io/gorm"
)

var DB *gorm.DB

var dbRetries = 0

func InitializeDB() error {
	dsn := fmt.Sprintf("clickhouse://%s:%s@%s:%s/%s?dial_timeout=10s&read_timeout=20s", config.DatabaseUser, config.DatabasePassword, config.DatabaseHost, config.DatabasePort, config.DatabaseName)
	db, err := gorm.Open(clickhouse.Open(dsn), &gorm.Config{})
	if err != nil {
		if dbRetries < 5 {
			dbRetries++
			utils.SugarLogger.Errorln("failed to connect database, retrying in 5s... ")
			time.Sleep(time.Second * 5)
			return InitializeDB()
		} else {
			return fmt.Errorf("failed to connect database after 5 attempts")
		}
	} else {
		utils.SugarLogger.Infoln("[DB] Connected to database")
		db.Set("gorm:table_options", "ENGINE=ReplacingMergeTree() ORDER BY (timestamp, vehicle_id, name)").AutoMigrate(&mapache.Signal{})
		db.Set("gorm:table_options", "ENGINE=ReplacingMergeTree() ORDER BY (vehicle_id, ping)").AutoMigrate(&mapache.Ping{})
		utils.SugarLogger.Infoln("[DB] AutoMigration complete")
		DB = db
	}
	return nil
}

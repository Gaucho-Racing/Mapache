package utils

import (
	"trip/config"

	"go.uber.org/zap"
)

var Logger *zap.Logger
var SugarLogger *zap.SugaredLogger

func InitializeLogger() {
	Logger = zap.Must(zap.NewProduction())
	if config.Env == "DEV" {
		Logger = zap.Must(zap.NewDevelopment())
	}
	SugarLogger = Logger.Sugar()
}

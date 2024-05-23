package utils

import (
	"go.uber.org/zap"
	"rincon/config"
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

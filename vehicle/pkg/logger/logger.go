package logger

import (
	"go.uber.org/zap"
)

var Logger *zap.Logger
var SugarLogger *zap.SugaredLogger

func Init(production bool) {
	Logger = zap.Must(zap.NewProduction())
	if !production {
		Logger = zap.Must(zap.NewDevelopment(zap.AddCaller(), zap.AddStacktrace(zap.ErrorLevel)))
	}
	SugarLogger = Logger.Sugar()
}

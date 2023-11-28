package main

import (
	"ingest/config"
	"ingest/utils"
)

func main() {
	utils.InitializeLogger()
	defer utils.Logger.Sync()
	
	utils.SugarLogger.Info("Ingest Service v" + config.Version)
}

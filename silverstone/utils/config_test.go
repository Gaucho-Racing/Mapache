package utils

import (
	"silverstone/config"
	"testing"
)

func TestVerifyConfig(t *testing.T) {
	InitializeLogger()
	t.Run("Test Blank Config", func(t *testing.T) {
		config.Service.Name = ""
		config.Env = ""
		config.Port = ""
		config.DatabaseHost = ""
		config.DatabasePort = ""
		config.DatabaseName = ""
		config.DatabaseUser = ""
		config.DatabasePassword = ""
		config.RinconUser = ""
		config.RinconPassword = ""
		VerifyConfig()
		if config.Service.Name != "bro_didnt_name_this_shit" {
			t.Errorf("Service.Name is not %s", "bro_didnt_name_this_shit")
		}
	})
}

package rincon

import (
	"os"
	"time"

	"github.com/bk1031/rincon-go/v2"
	"github.com/gaucho-racing/mapache/auth/pkg/logger"
)

var RinconClient *rincon.Client
var RinconUser = os.Getenv("RINCON_USER")
var RinconPassword = os.Getenv("RINCON_PASSWORD")
var RinconEndpoint = os.Getenv("RINCON_ENDPOINT")

func Init(service *rincon.Service, routes *[]rincon.Route) {
	if RinconUser == "" || RinconPassword == "" || RinconEndpoint == "" {
		logger.SugarLogger.Errorln("Rincon user, password, or endpoint is not set")
		return
	}
	client := createClient(RinconEndpoint, RinconUser, RinconPassword)
	if client == nil {
		return
	}
	id, err := client.Register(*service, *routes)
	if err != nil {
		logger.SugarLogger.Fatalf("Failed to register service with Rincon: %v", err)
		return
	}
	logger.SugarLogger.Infof("Registered service with ID: %d", id)
	RinconClient = client
	*service = *client.Service()
}

func createClient(endpoint string, user string, password string) *rincon.Client {
	rinconRetries := 0
	for rinconRetries < 5 {
		client, err := rincon.NewClient(rincon.Config{
			BaseURL:           endpoint,
			HeartbeatMode:     rincon.ServerHeartbeat,
			HeartbeatInterval: 60,
			AuthUser:          user,
			AuthPassword:      password,
		})
		if err != nil {
			if rinconRetries < 5 {
				logger.SugarLogger.Errorf("Failed to create Rincon client with %s: %v, retrying in 5s...", endpoint, err)
				rinconRetries++
				time.Sleep(time.Second * 5)
			} else {
				logger.SugarLogger.Errorln("Failed to create Rincon client after 5 attempts")
				return nil
			}
		} else {
			logger.SugarLogger.Infof("Created Rincon client with endpoint %s", endpoint)
			return client
		}
	}
	return nil
}

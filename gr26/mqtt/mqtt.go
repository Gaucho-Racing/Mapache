package mqtt

import (
	"fmt"

	"github.com/gaucho-racing/mapache/gr26/config"
	"github.com/gaucho-racing/mapache/gr26/pkg/logger"

	mq "github.com/eclipse/paho.mqtt.golang"
)

var Client mq.Client

func Init() {
	opts := mq.NewClientOptions()
	opts.AddBroker(fmt.Sprintf("tcp://%s:%s", config.MQTTHost, config.MQTTPort))
	opts.SetUsername(config.MQTTUser)
	opts.SetPassword(config.MQTTPassword)
	opts.SetCleanSession(true)
	opts.SetOrderMatters(false)
	opts.SetAutoReconnect(true)
	opts.SetClientID(fmt.Sprintf("%s-%d", config.Service.Name, config.Service.ID))
	Client = mq.NewClient(opts)
	if token := Client.Connect(); token.Wait() && token.Error() != nil {
		logger.SugarLogger.Fatalln("[MQ] Failed to connect to MQTT", token.Error())
	}
	logger.SugarLogger.Infoln("[MQ] Connected to MQTT broker")
}

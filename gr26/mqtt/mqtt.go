package mqtt

import (
	"fmt"
	"time"

	"github.com/gaucho-racing/mapache/gr26/config"
	"github.com/gaucho-racing/mapache/gr26/pkg/logger"

	mq "github.com/eclipse/paho.mqtt.golang"
)

var Client mq.Client

const (
	connectTimeout       = 15 * time.Second
	connectRetryInterval = 5 * time.Second
)

func Init(onConnect func()) {
	opts := mq.NewClientOptions()
	opts.AddBroker(fmt.Sprintf("tcp://%s:%s", config.MQTTHost, config.MQTTPort))
	opts.SetUsername(config.MQTTUser)
	opts.SetPassword(config.MQTTPassword)
	opts.SetCleanSession(true)
	opts.SetOrderMatters(false)
	opts.SetAutoReconnect(true)
	opts.SetConnectTimeout(connectTimeout)
	opts.SetConnectRetry(true)
	opts.SetConnectRetryInterval(connectRetryInterval)
	opts.SetClientID(fmt.Sprintf("%s-%d", config.Service.Name, config.Service.ID))
	opts.SetOnConnectHandler(func(c mq.Client) {
		logger.SugarLogger.Infoln("[MQ] Connected to MQTT broker")
		if onConnect != nil {
			onConnect()
		}
	})
	opts.SetConnectionLostHandler(func(c mq.Client, err error) {
		logger.SugarLogger.Warnf("[MQ] Connection lost: %v", err)
	})
	Client = mq.NewClient(opts)

	go func() {
		token := Client.Connect()
		if !token.WaitTimeout(connectTimeout) {
			logger.SugarLogger.Warnf("[MQ] Initial connect to %s:%s timed out after %s, paho will keep retrying every %s",
				config.MQTTHost, config.MQTTPort, connectTimeout, connectRetryInterval)
			return
		}
		if err := token.Error(); err != nil {
			logger.SugarLogger.Warnf("[MQ] Initial connect failed: %v, paho will keep retrying every %s", err, connectRetryInterval)
		}
	}()
}

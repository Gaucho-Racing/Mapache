package mqtt

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"sync"
	"time"

	"github.com/gaucho-racing/mapache/gr26/config"
	"github.com/gaucho-racing/mapache/gr26/pkg/logger"

	"github.com/eclipse/paho.golang/autopaho"
	"github.com/eclipse/paho.golang/paho"
)

const (
	sharedSubGroup = "gr26-cluster"
	canTopicFilter = "$share/" + sharedSubGroup + "/gr26/#"
)

const (
	keepAliveSeconds = 30
	connectTimeout   = 15 * time.Second
)

var Manager *autopaho.ConnectionManager

type MessageHandler func(topic string, payload []byte)

var (
	handlerMu sync.RWMutex
	handler   MessageHandler
)

func SetMessageHandler(h MessageHandler) {
	handlerMu.Lock()
	handler = h
	handlerMu.Unlock()
}

func Init(ctx context.Context) error {
	serverURL, err := url.Parse(fmt.Sprintf("mqtt://%s:%s", config.MQTTHost, config.MQTTPort))
	if err != nil {
		return fmt.Errorf("invalid MQTT URL: %w", err)
	}

	host, err := os.Hostname()
	if err != nil || host == "" {
		host = fmt.Sprintf("pid%d", os.Getpid())
	}
	clientID := fmt.Sprintf("%s-%s", config.Service.Name, host)

	cfg := autopaho.ClientConfig{
		ServerUrls:                    []*url.URL{serverURL},
		KeepAlive:                     keepAliveSeconds,
		ConnectTimeout:                connectTimeout,
		ConnectUsername:               config.MQTTUser,
		ConnectPassword:               []byte(config.MQTTPassword),
		CleanStartOnInitialConnection: true,
		SessionExpiryInterval:         0,
		OnConnectionUp: func(cm *autopaho.ConnectionManager, _ *paho.Connack) {
			logger.SugarLogger.Infoln("[MQ] Connected to MQTT broker")
			if _, err := cm.Subscribe(context.Background(), &paho.Subscribe{
				Subscriptions: []paho.SubscribeOptions{
					{Topic: canTopicFilter, QoS: 0},
				},
			}); err != nil {
				logger.SugarLogger.Warnf("[MQ] Subscribe to %s failed: %v", canTopicFilter, err)
			}
		},
		OnConnectError: func(err error) {
			logger.SugarLogger.Warnf("[MQ] Connection error: %v", err)
		},
		ClientConfig: paho.ClientConfig{
			ClientID: clientID,
			OnPublishReceived: []func(paho.PublishReceived) (bool, error){
				func(pr paho.PublishReceived) (bool, error) {
					handlerMu.RLock()
					h := handler
					handlerMu.RUnlock()
					if h != nil {
						h(pr.Packet.Topic, pr.Packet.Payload)
					}
					return true, nil
				},
			},
			OnClientError: func(err error) {
				logger.SugarLogger.Warnf("[MQ] Client error: %v", err)
			},
			OnServerDisconnect: func(d *paho.Disconnect) {
				logger.SugarLogger.Warnf("[MQ] Server disconnect: reason=%d", d.ReasonCode)
			},
		},
	}

	cm, err := autopaho.NewConnection(ctx, cfg)
	if err != nil {
		return fmt.Errorf("autopaho.NewConnection: %w", err)
	}
	Manager = cm
	return nil
}

func Publish(ctx context.Context, topic string, payload []byte) {
	if Manager == nil {
		return
	}
	if _, err := Manager.Publish(ctx, &paho.Publish{
		QoS:     0,
		Topic:   topic,
		Payload: payload,
	}); err != nil {
		logger.SugarLogger.Warnf("[MQ] Publish to %s failed: %v", topic, err)
	}
}

func PublishJSON(ctx context.Context, topic string, v any) {
	payload, err := json.Marshal(v)
	if err != nil {
		logger.SugarLogger.Warnf("[MQ] JSON marshal for %s failed: %v", topic, err)
		return
	}
	Publish(ctx, topic, payload)
}

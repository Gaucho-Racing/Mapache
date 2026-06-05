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

// Shared subscription so multiple gr26 replicas fan out the CAN-frame
// stream — NanoMQ load-balances delivery across all members of the
// "ingest" group. Single-replica deployments still work; the broker
// just routes everything to the one member.
const (
	sharedSubGroup = "ingest"
	canTopicFilter = "$share/" + sharedSubGroup + "/gr26/#"
)

const (
	keepAliveSeconds = 30
	connectTimeout   = 15 * time.Second
)

// Manager is the singleton autopaho v5 ConnectionManager. Exposed so
// publish-side callers (pongs, decoded signals) can reach it directly;
// inbound messages come through the handler registered via
// SetMessageHandler.
var Manager *autopaho.ConnectionManager

type MessageHandler func(topic string, payload []byte)

var (
	handlerMu sync.RWMutex
	handler   MessageHandler
)

// SetMessageHandler wires the function that processes inbound
// messages from the shared subscription. Call this before Init so the
// OnConnectionUp subscribe can't race against arriving frames.
func SetMessageHandler(h MessageHandler) {
	handlerMu.Lock()
	handler = h
	handlerMu.Unlock()
}

// Init brings up the autopaho-managed v5 connection and subscribes
// to the shared CAN-frame topic inside OnConnectionUp so the
// subscription is re-established on every reconnect.
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
		ServerUrls:      []*url.URL{serverURL},
		KeepAlive:       keepAliveSeconds,
		ConnectTimeout:  connectTimeout,
		ConnectUsername: config.MQTTUser,
		ConnectPassword: []byte(config.MQTTPassword),
		// Mirror the v3 SetCleanSession(true) behavior — we're QoS 0
		// with no need for retained session state across reconnects.
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

// Publish is a fire-and-forget QoS 0 helper. At QoS 0 paho returns
// once the packet hits TCP; broker-down surfaces as an error here
// (we log and move on — next CAN frame for the same ID is 30-100ms
// behind, retrying QoS 0 is wasted effort).
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

// PublishJSON marshals v to JSON and publishes it at QoS 0, retain=false.
// Used by the decoded-signal fan-out to query/live/<vid>/<name>.
func PublishJSON(ctx context.Context, topic string, v any) {
	payload, err := json.Marshal(v)
	if err != nil {
		logger.SugarLogger.Warnf("[MQ] JSON marshal for %s failed: %v", topic, err)
		return
	}
	Publish(ctx, topic, payload)
}

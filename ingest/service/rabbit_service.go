package service

import (
	"fmt"
	mqtt "github.com/eclipse/paho.mqtt.golang"
	"ingest/config"
	"ingest/utils"
	"math/rand"
	"strconv"
)

var RabbitClient mqtt.Client

var clientID string

func InitializeRabbit() {
	id := rand.Intn(100)
	clientID = "ingest_mqtt_" + strconv.Itoa(id)

	opts := mqtt.NewClientOptions()
	opts.AddBroker(fmt.Sprintf("tcp://%s:%s", config.MQTTHost, config.MQTTPort))
	opts.SetClientID(clientID)
	opts.SetUsername(config.MQTTUser)
	opts.SetPassword(config.MQTTPassword)
	opts.SetDefaultPublishHandler(messagePubHandler)
	opts.OnConnect = connectHandler
	opts.OnConnectionLost = connectLostHandler
	client := mqtt.NewClient(opts)
	if token := client.Connect(); token.Wait() && token.Error() != nil {
		utils.SugarLogger.Fatalln(token.Error())
	}
	RabbitClient = client
	sub(RabbitClient)
	InitializeGR24Subscriptions()
}

var messagePubHandler mqtt.MessageHandler = func(client mqtt.Client, msg mqtt.Message) {
	utils.SugarLogger.Infoln("[MQ] Received message: " + string(msg.Payload()) + " from topic: " + msg.Topic())
}

var connectHandler mqtt.OnConnectHandler = func(client mqtt.Client) {
	utils.SugarLogger.Infoln("[MQ] Connected to RabbitMQ as: " + clientID)
}

var connectLostHandler mqtt.ConnectionLostHandler = func(client mqtt.Client, err error) {
	utils.SugarLogger.Infoln("[MQ] Connection lost: ", err)
}

func sub(client mqtt.Client) {
	topic := "meta"
	token := client.Subscribe(topic, 1, nil)
	token.Wait()
	utils.SugarLogger.Infoln("[MQ] Subscribed to topic: ", topic)
}

func InitializeGR24Subscriptions() {
	GR24InitializePedalIngest()
}

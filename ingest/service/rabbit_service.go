package service

import (
	"fmt"
	mqtt "github.com/eclipse/paho.mqtt.golang"
	"ingest/config"
	"ingest/model/gr24"
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
}

var messagePubHandler mqtt.MessageHandler = func(client mqtt.Client, msg mqtt.Message) {
	fmt.Printf("[MQ] Received message: %s from topic: %s\n", msg.Payload(), msg.Topic())
	// temporary test handler for pedal through meta topic
	if msg.Topic() == "meta" {
		pedal := gr24.ParsePedal(msg.Payload())
		if pedal.ID != "" {
			err := CreatePedal(pedal)
			if err != nil {
				utils.SugarLogger.Errorln(err)
			}
		}
	}
}

var connectHandler mqtt.OnConnectHandler = func(client mqtt.Client) {
	fmt.Println("[MQ] Connected to RabbitMQ as: " + clientID)
}

var connectLostHandler mqtt.ConnectionLostHandler = func(client mqtt.Client, err error) {
	fmt.Printf("[MQ] Connection lost: %v", err)
}

func sub(client mqtt.Client) {
	topic := "meta"
	token := client.Subscribe(topic, 1, nil)
	token.Wait()
	fmt.Println("[MQ] Subscribed to topic: ", topic)
}

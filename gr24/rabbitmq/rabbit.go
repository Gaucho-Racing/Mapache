package rabbitmq

import (
	"fmt"
	"gr24/config"
	"gr24/service"
	"gr24/utils"
	"math/rand"
	"strconv"

	mqtt "github.com/eclipse/paho.mqtt.golang"
)

var Client mqtt.Client

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
	Client = client
	sub(Client, "meta")
	InitializeIngest()
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

func sub(client mqtt.Client, topic string) {
	token := client.Subscribe(topic, 0, nil)
	token.Wait()
	utils.SugarLogger.Infoln("[MQ] Subscribed to topic: ", topic)
}

func InitializeIngest() {
	subscribePedal(Client)
}

func subscribePedal(client mqtt.Client) {
	client.Subscribe("gr24/+/pedal", 0, service.PedalIngestCallback)
	utils.SugarLogger.Infoln("[MQ] Subscribed to topic: gr24/+/pedal")
}

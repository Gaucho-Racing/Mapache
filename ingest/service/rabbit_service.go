package service

import (
	"fmt"
	mqtt "github.com/eclipse/paho.mqtt.golang"
	"time"
)

var RabbitClient mqtt.Client

func InitializeRabbit() {
	var broker = "localhost"
	var port = 1883
	opts := mqtt.NewClientOptions()
	opts.AddBroker(fmt.Sprintf("tcp://%s:%d", broker, port))
	opts.SetClientID("ingest_mqtt")
	opts.SetUsername("guest")
	opts.SetPassword("guest")
	opts.SetDefaultPublishHandler(messagePubHandler)
	opts.OnConnect = connectHandler
	opts.OnConnectionLost = connectLostHandler
	client := mqtt.NewClient(opts)
	if token := client.Connect(); token.Wait() && token.Error() != nil {
		panic(token.Error())
	}
	RabbitClient = client
	sub(RabbitClient)
}

var messagePubHandler mqtt.MessageHandler = func(client mqtt.Client, msg mqtt.Message) {
	fmt.Printf("[MQ] Received message: %s from topic: %s\n", msg.Payload(), msg.Topic())
}

var connectHandler mqtt.OnConnectHandler = func(client mqtt.Client) {
	fmt.Println("[MQ] Connected to RabbitMQ")
}

var connectLostHandler mqtt.ConnectionLostHandler = func(client mqtt.Client, err error) {
	fmt.Printf("[MQ] Connection lost: %v", err)
}

func Publish(client mqtt.Client) {
	for i := 0; i < 50; i++ {
		text := fmt.Sprintf("Message %d", i)
		token := client.Publish("meta/ping", 1, false, text)
		token.Wait()
		time.Sleep(time.Second)
	}
}

func sub(client mqtt.Client) {
	topic := "meta"
	token := client.Subscribe(topic, 1, nil)
	token.Wait()
	fmt.Println("[MQ] Subscribed to topic: ", topic)
}

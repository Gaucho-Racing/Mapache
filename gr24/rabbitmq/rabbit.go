package rabbitmq

import (
	"fmt"
	"gr24/config"
	"gr24/model"
	"gr24/service"
	"gr24/utils"
	"math/rand"
	"strconv"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/google/uuid"
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
}

var messagePubHandler mqtt.MessageHandler = func(client mqtt.Client, msg mqtt.Message) {
	utils.SugarLogger.Infoln("[MQ] Received message: " + string(msg.Payload()) + " from topic: " + msg.Topic())
}

var connectHandler mqtt.OnConnectHandler = func(client mqtt.Client) {
	utils.SugarLogger.Infoln("[MQ] Connected to RabbitMQ as: " + clientID)
	InitializeIngest()
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
	sub(Client, "meta")
	subscribePedal(Client)
	subscribeACU(Client)
	subscribeBCM(Client)
	subscribeWheel(Client)
	subscribeSteeringWheel(Client)
	subscribeVDM(Client)
	subscribePong(Client)
	go pingLoop()
}

func pingLoop() {
	for {
		vehicles := []string{"test"}
		for _, vehicleID := range vehicles {
			lastPing, _ := service.GetLastPing(vehicleID)
			if lastPing.ID != "" && lastPing.Pong == 0 {
				lastSuccessfulPing, _ := service.GetLastSuccessfulPing(vehicleID)
				if lastSuccessfulPing.ID != "" {
					ago := time.Now().UnixMilli() - lastSuccessfulPing.Pong
					utils.SugarLogger.Warnf("Last ping from vehicle %s was %dms ago!", vehicleID, ago)
				}
			}
			go publishPing(Client, vehicleID)
		}
		interval, err := strconv.Atoi(config.TCMPingInterval)
		if err != nil {
			interval = 1000
		}
		time.Sleep(time.Duration(interval) * time.Millisecond)
	}
}

func publishPing(client mqtt.Client, vehicleID string) {
	ping := model.Ping{}
	ping.ID = uuid.New().String()
	ping.VehicleID = vehicleID
	ping.Ping = time.Now().UnixMilli()
	go service.CreatePing(ping)
	_ = client.Publish("gr24/"+vehicleID+"/ping", 0, false, []byte("ping"))
}

func subscribePong(client mqtt.Client) {
	client.Subscribe("gr24/+/pong", 0, service.PingIngestCallback)
	utils.SugarLogger.Infoln("[MQ] Subscribed to topic: gr24/+/pong")
}

func subscribePedal(client mqtt.Client) {
	client.Subscribe("gr24/+/pedal", 0, service.PedalIngestCallback)
	utils.SugarLogger.Infoln("[MQ] Subscribed to topic: gr24/+/pedal")
}

func subscribeACU(client mqtt.Client) {
	client.Subscribe("gr24/+/acu", 0, service.ACUIngestCallback)
	utils.SugarLogger.Infoln("[MQ] Subscribed to topic: gr24/+/acu")
}

func subscribeBCM(client mqtt.Client) {
	client.Subscribe("gr24/+/bcm", 0, service.BCMIngestCallback)
	utils.SugarLogger.Infoln("[MQ] Subscribed to topic: gr24/+/bcm")
}

func subscribeWheel(client mqtt.Client) {
	client.Subscribe("gr24/+/wheel/+", 0, service.WheelIngestCallback)
	utils.SugarLogger.Infoln("[MQ] Subscribed to topic: gr24/+/wheel/+")
}

func subscribeSteeringWheel(client mqtt.Client) {
	client.Subscribe("gr24/+/steering_wheel", 0, service.SteeringWheelIngestCallback)
	utils.SugarLogger.Infoln("[MQ] Subscribed to topic: gr24/+/steering_wheel")
}

func subscribeVDM(client mqtt.Client) {
	client.Subscribe("gr24/+/vdm", 0, service.VDMIngestCallback)
	utils.SugarLogger.Infoln("[MQ] Subscribed to topic: gr24/+/vdm")
}

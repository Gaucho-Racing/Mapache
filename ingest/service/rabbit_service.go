package service

import (
	"context"
	"fmt"
	mqtt "github.com/eclipse/paho.mqtt.golang"
	amqp "github.com/rabbitmq/amqp091-go"
	"ingest/utils"
	"strconv"
	"time"
)

var RabbitConn *amqp.Connection

func InitializeRabbit() {
	//conn, err := amqp.Dial("amqp://guest:guest@localhost:5672/")
	//if err != nil {
	//	utils.SugarLogger.Errorln("Failed to connect to RabbitMQ: " + err.Error())
	//	return
	//} else {
	//	utils.SugarLogger.Infoln("Successfully connected to RabbitMQ!")
	//}
	//RabbitConn = conn
	//CreateQueues([]string{"meta", "alert"})

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

	sub(client)
}

var messagePubHandler mqtt.MessageHandler = func(client mqtt.Client, msg mqtt.Message) {
	fmt.Printf("Received message: %s from topic: %s\n", msg.Payload(), msg.Topic())

}

var connectHandler mqtt.OnConnectHandler = func(client mqtt.Client) {
	fmt.Println("Connected")
}

var connectLostHandler mqtt.ConnectionLostHandler = func(client mqtt.Client, err error) {
	fmt.Printf("Connect lost: %v", err)
}

func publish(client mqtt.Client) {
	num := 10
	for i := 0; i < num; i++ {
		text := fmt.Sprintf("Message %d", i)
		token := client.Publish("topic/test", 0, false, text)
		token.Wait()
		time.Sleep(time.Second)
	}
}

func sub(client mqtt.Client) {
	topic := "meta"
	token := client.Subscribe(topic, 1, nil)
	token.Wait()
	fmt.Printf("Subscribed to topic: %s", topic)
}

func CreateQueues(names []string) {
	ch, err := RabbitConn.Channel()
	if err != nil {
		utils.SugarLogger.Errorln("Failed to open a channel: " + err.Error())
		return
	}
	defer ch.Close()

	for _, name := range names {
		q, err := ch.QueueDeclare(
			name,
			false,
			false,
			false,
			false,
			nil,
		)
		if err != nil {
			utils.SugarLogger.Errorln("Failed to create queue \"" + name + "\": " + err.Error())
		} else {
			utils.SugarLogger.Infoln("Queue \"" + q.Name + "\" successfully created!")
			go ListenQueue(q.Name)
		}
	}
	utils.SugarLogger.Infoln("Finished creating queues!")
}

func CreateVehicleQueues(vehicles []string) {
	vehicleQueues := []string{
		"vdm",
		"wheel/fr",
		"wheel/fl",
		"wheel/rr",
		"wheel/rl",
	}
	var compositeQueues []string
	for _, vehicle := range vehicles {
		for _, queue := range vehicleQueues {
			compositeQueues = append(compositeQueues, vehicle+"/"+queue)
		}
	}
	CreateQueues(compositeQueues)
	utils.SugarLogger.Infoln("Finished creating vehicle queues!")
}

func TestContinuousMetaSend() {
	i := 0
	for {
		TestMetaSend("test message " + strconv.Itoa(i))
		time.Sleep(5 * time.Second)
		i++
	}
}

func TestMetaSend(message string) {
	ch, err := RabbitConn.Channel()
	if err != nil {
		utils.SugarLogger.Errorln("Failed to open a channel: " + err.Error())
		return
	}
	defer ch.Close()

	q, err := ch.QueueDeclare(
		"meta",
		false,
		false,
		false,
		false,
		nil,
	)
	//logError(err, "Failed to bind to a queue")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err = ch.PublishWithContext(ctx,
		"",
		q.Name,
		false,
		false,
		amqp.Publishing{
			ContentType: "text/plain",
			Body:        []byte(message),
		})
	//logError(err, "Failed to publish a message")
	utils.SugarLogger.Infoln(" [x] Sent: " + message)
}

func ListenQueue(queue string) {
	ch, err := RabbitConn.Channel()
	if err != nil {
		utils.SugarLogger.Errorln("Failed to open a channel: " + err.Error())
		return
	}
	defer ch.Close()

	q, err := ch.QueueDeclare(
		queue,
		false,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		utils.SugarLogger.Errorln("Failed to bind to queue \"" + queue + "\": " + err.Error())
		return
	}

	messages, err := ch.Consume(
		q.Name,
		"",
		true,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		utils.SugarLogger.Errorln("Failed to consume messages from queue \"" + q.Name + "\": " + err.Error())
		return
	}

	var forever chan struct{}

	go func() {
		for m := range messages {
			utils.SugarLogger.Infoln("[MQ-" + q.Name + "] Received msg: " + string(m.Body))
		}
	}()
	utils.SugarLogger.Infoln("[MQ] Listening on \"" + q.Name + "\"...")
	<-forever
}

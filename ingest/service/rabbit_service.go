package service

import (
	"context"
	amqp "github.com/rabbitmq/amqp091-go"
	"ingest/utils"
	"log"
	"strconv"
	"time"
)

var RabbitConn *amqp.Connection

func InitializeRabbit() {
	conn, err := amqp.Dial("amqp://guest:guest@localhost:5672/")
	logError(err, "Failed to connect to RabbitMQ")
	RabbitConn = conn
	CreateMetaQueue()
	CreateAlertQueue()
}

func CreateMetaQueue() {
	ch, err := RabbitConn.Channel()
	logError(err, "Failed to open a channel")
	q, err := ch.QueueDeclare(
		"meta",
		false,
		false,
		false,
		false,
		nil,
	)
	logError(err, "Failed to declare a queue")
	utils.SugarLogger.Infoln("Queue \"" + q.Name + "\" successfully created!")
}

func CreateAlertQueue() {
	ch, err := RabbitConn.Channel()
	logError(err, "Failed to open a channel")
	q, err := ch.QueueDeclare(
		"alert",
		false,
		false,
		false,
		false,
		nil,
	)
	logError(err, "Failed to declare a queue")
	utils.SugarLogger.Infoln("Queue \"" + q.Name + "\" successfully created!")
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
	logError(err, "Failed to open a channel")
	defer ch.Close()

	q, err := ch.QueueDeclare(
		"meta",
		false,
		false,
		false,
		false,
		nil,
	)
	logError(err, "Failed to bind to a queue")

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
	logError(err, "Failed to publish a message")
	utils.SugarLogger.Infoln(" [x] Sent: ", message)
}

func ListenMeta() {
	ch, err := RabbitConn.Channel()
	logError(err, "Failed to open a channel")
	defer ch.Close()

	q, err := ch.QueueDeclare(
		"meta",
		false,
		false,
		false,
		false,
		nil,
	)
	logError(err, "Failed to declare a queue")

	msgs, err := ch.Consume(
		q.Name,
		"",
		true,
		false,
		false,
		false,
		nil,
	)
	logError(err, "Failed to register a consumer")

	var forever chan struct{}

	go func() {
		for d := range msgs {
			log.Printf("Received a message: %s", d.Body)
		}
	}()

	log.Printf(" [*] Waiting for messages...")
	<-forever
}

func logError(err error, msg string) {
	if err != nil {
		utils.SugarLogger.Errorln("%s: %s", msg, err)
	}
}

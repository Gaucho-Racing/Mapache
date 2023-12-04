package service

import (
	"context"
	amqp "github.com/rabbitmq/amqp091-go"
	"ingest/utils"
	"time"
)

var RabbitConn *amqp.Connection

func InitializeRabbit() {
	conn, err := amqp.Dial("amqp://guest:guest@localhost:5672/")
	logError(err, "Failed to connect to RabbitMQ")
	RabbitConn = conn
	CreateMetaQueue()
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
	//TestSend()
}

func TestSend() {
	ch, err := RabbitConn.Channel()
	logError(err, "Failed to open a channel")
	defer ch.Close()

	err = ch.QueueBind("meta", "#", "amq.topic", false, nil)
	logError(err, "Failed to bind to a queue")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	body := "Hello World!"
	err = ch.PublishWithContext(ctx,
		"",     // exchange
		"meta", // routing key
		false,  // mandatory
		false,  // immediate
		amqp.Publishing{
			ContentType: "text/plain",
			Body:        []byte(body),
		})
	logError(err, "Failed to publish a message")
	utils.SugarLogger.Infoln(" [x] Sent %s\n", body)
}

func logError(err error, msg string) {
	if err != nil {
		utils.SugarLogger.Errorln("%s: %s", msg, err)
	}
}

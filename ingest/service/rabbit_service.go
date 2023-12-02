package service

import (
	"ingest/utils"
	"context"
	amqp "github.com/rabbitmq/amqp091-go"
	"time"
)

var RabbitConn *amqp.Connection
func ConnectRabbit() {
	conn, err := amqp.Dial("amqp://guest:guest@localhost:5672/")
	failOnError(err, "Failed to connect to RabbitMQ")
	RabbitConn = conn
}

func failOnError(err error, msg string) {
	if err != nil {
		utils.SugarLogger.Errorln("%s: %s", msg, err)
	}
}

func TestSend() {
	ch, err := RabbitConn.Channel()
	failOnError(err, "Failed to open a channel")
	defer ch.Close()
	
	q, err := ch.QueueDeclare(
		"hello", // name
		false,   // durable
		false,   // delete when unused
		false,   // exclusive
		false,   // no-wait
		nil,     // arguments
		)
	failOnError(err, "Failed to declare a queue")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	body := "Hello World!"
	err = ch.PublishWithContext(ctx,
		"",     // exchange
		q.Name, // routing key
		false,  // mandatory
		false,  // immediate
		amqp.Publishing {
		ContentType: "text/plain",
		Body:        []byte(body),
		})
	failOnError(err, "Failed to publish a message")
	utils.SugarLogger.Infoln(" [x] Sent %s\n", body)
}
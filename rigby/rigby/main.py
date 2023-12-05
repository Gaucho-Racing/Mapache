import random
import time
import pika

def main() -> None:
    """
    Run the main application logic.
    """
    for i in range(200):
        publish_message('meta', 'Message ' + str(i))
        time.sleep(0.1)
        if random.randint(1, 10) < 2:
            publish_message('alert', 'Alert message ' + str(i))

if __name__ == "__main__":
    main()

def publish_message(queue: str, message: str) -> None:
    """
    Publish a message to the specified queue.
    """
    connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
    channel = connection.channel()

    channel.queue_declare(queue=queue)
    channel.basic_publish(exchange='',
        routing_key=queue,
        body=message,
        properties=pika.BasicProperties(
            expiration='2000'
    ))
    print(" [" + str(queue) + "] Sent msg: '" + str(message) + "'")